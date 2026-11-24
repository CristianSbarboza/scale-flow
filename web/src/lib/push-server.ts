import "server-only";

import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions, pushVapidKeys, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

let cachedVapidKeys: { publicKey: string; privateKey: string } | null = null;

/**
 * Obtém (ou gera e persiste na primeira execução) o par de chaves VAPID.
 * Permite que o Web Push funcione em produção sem exigir configuração manual
 * de variáveis de ambiente na Vercel.
 */
export async function getOrCreateVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (cachedVapidKeys) return cachedVapidKeys;

  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    cachedVapidKeys = { publicKey: envPub, privateKey: envPriv };
    return cachedVapidKeys;
  }

  const [existing] = await db
    .select()
    .from(pushVapidKeys)
    .where(eq(pushVapidKeys.id, 1));

  if (existing) {
    cachedVapidKeys = {
      publicKey: existing.publicKey,
      privateKey: existing.privateKey,
    };
    return cachedVapidKeys;
  }

  const generated = webpush.generateVAPIDKeys();
  await db
    .insert(pushVapidKeys)
    .values({
      id: 1,
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
    })
    .onConflictDoNothing();

  const [saved] = await db
    .select()
    .from(pushVapidKeys)
    .where(eq(pushVapidKeys.id, 1));

  cachedVapidKeys = {
    publicKey: saved?.publicKey ?? generated.publicKey,
    privateKey: saved?.privateKey ?? generated.privateKey,
  };
  return cachedVapidKeys;
}

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envia notificação Web Push em segundo plano para todos os dispositivos
 * inscritos dos usuários informados (desde que `notificationsEnabled` e
 * `isActive` sejam verdadeiros).
 */
export async function sendWebPushToUsers(
  userIds: string[],
  payload: WebPushPayload,
): Promise<number> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return 0;

  try {
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, uniqueUserIds),
          eq(users.isActive, true),
          eq(users.notificationsEnabled, true),
        ),
      );

    const allowedUserIds = activeUsers.map((u) => u.id);
    if (allowedUserIds.length === 0) return 0;

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, allowedUserIds));

    if (subs.length === 0) return 0;

    const vapid = await getOrCreateVapidKeys();
    webpush.setVapidDetails(
      "mailto:contato@flowintic.com.br",
      vapid.publicKey,
      vapid.privateKey,
    );

    const bodyJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/servant?aba=notifications",
      tag: payload.tag ?? "scaleflow-notification",
    });

    let delivered = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            bodyJson,
          );
          delivered++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          // 404 ou 410 significa que a inscrição expirou ou foi revogada no aparelho
          if (statusCode === 404 || statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id))
              .catch(() => {});
          }
        }
      }),
    );

    return delivered;
  } catch (error) {
    console.error("Erro ao enviar Web Push:", error);
    return 0;
  }
}
