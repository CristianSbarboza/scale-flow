"use server";

import { db } from "@/db";
import {
  users,
  servants,
  schedules,
  notificationLog,
  servantNotificationReads,
  pushSubscriptions,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { getOrCreateVapidKeys, sendWebPushToUsers } from "@/lib/push-server";
import type { ServantNotificationItem } from "@/types/domain";

interface Verse {
  text: string;
  reference: string;
}

/**
 * Mesmo acervo de versículos (NVI) e algoritmo determinístico (FNV-1a) do
 * serviço `whatsapp/src/reminders/VerseBook.ts`.
 */
const DEFAULT_VERSES: readonly Verse[] = [
  {
    text: "Irmãos, vocês foram chamados para a liberdade. Mas não usem a liberdade para dar ocasião à vontade da carne; ao contrário, sirvam uns aos outros mediante o amor.",
    reference: "Gálatas 5:13",
  },
  {
    text: "Cada um exerça o dom que recebeu para servir aos outros, administrando fielmente a graça de Deus em suas múltiplas formas.",
    reference: "1 Pedro 4:10",
  },
  {
    text: "Tudo o que fizerem, façam-no de todo o coração, como para o Senhor, e não para os homens, sabendo que receberão do Senhor a recompensa da herança. É a Cristo, o Senhor, que vocês estão servindo.",
    reference: "Colossenses 3:23-24",
  },
  {
    text: "Ao contrário, quem quiser tornar-se importante entre vocês deverá ser servo, e quem quiser ser o primeiro deverá ser servo dos demais.",
    reference: "Mateus 20:26-27",
  },
  {
    text: "Se, porém, não lhes agrada servir ao Senhor, escolham hoje a quem irão servir... Mas eu e a minha família serviremos ao Senhor.",
    reference: "Josué 24:15",
  },
  {
    text: "Sentando-se, Jesus chamou os Doze e disse: Se alguém quiser ser o primeiro, será o último e o servo de todos.",
    reference: "Marcos 9:35",
  },
  {
    text: "Sirvam com boa vontade, como ao Senhor, e não aos homens.",
    reference: "Efésios 6:7",
  },
  {
    text: "Se alguém me serve, siga-me; e onde estou, ali estará também o meu servo. Aquele que me serve, meu Pai o honrará.",
    reference: "João 12:26",
  },
  {
    text: "E não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos. Portanto, enquanto temos oportunidade, façamos o bem a todos, especialmente aos da família da fé.",
    reference: "Gálatas 6:9-10",
  },
  {
    text: "Mas, acima de tudo, temam o Senhor e o sirvam com fidelidade e de todo o coração; considerem quão grandes coisas ele fez por vocês.",
    reference: "1 Samuel 12:24",
  },
];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pickVerse(seed: string, avoid?: Verse): Verse {
  const i = fnv1a(seed) % DEFAULT_VERSES.length;
  const chosen = DEFAULT_VERSES[i];
  if (!avoid || chosen.reference !== avoid.reference) {
    return chosen;
  }
  return DEFAULT_VERSES[(i + 1) % DEFAULT_VERSES.length];
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function diaMes(isoDate: string): string {
  const clean = isoDate.slice(0, 10);
  return `${clean.slice(8, 10)}/${clean.slice(5, 7)}`;
}

function dataPorExtenso(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function periodoEscala(dates: { date: string }[]): string {
  if (dates.length === 0) return "";
  const sorted = [...dates].map((d) => d.date.slice(0, 10)).sort();
  const quantas = `${sorted.length} ${sorted.length === 1 ? "data" : "datas"}`;
  return sorted.length === 1
    ? `, com ${quantas} em ${diaMes(sorted[0])}`
    : `, com ${quantas} entre ${diaMes(sorted[0])} e ${diaMes(sorted[sorted.length - 1])}`;
}

export interface ServantNotificationState {
  notificationsEnabled: boolean;
  notifications: ServantNotificationItem[];
  unreadCount: number;
  vapidPublicKey: string;
}

export async function getServantNotificationState(): Promise<ServantNotificationState> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const [vapid, [me]] = await Promise.all([
    getOrCreateVapidKeys(),
    db
      .select({
        name: users.name,
        isActive: users.isActive,
        notificationsEnabled: users.notificationsEnabled,
      })
      .from(users)
      .where(eq(users.id, session.user.id)),
  ]);

  if (!me || !me.isActive) {
    return {
      notificationsEnabled: me?.notificationsEnabled ?? true,
      notifications: [],
      unreadCount: 0,
      vapidPublicKey: vapid.publicKey,
    };
  }

  const memberships = await db.query.servants.findMany({
    where: and(eq(servants.userId, session.user.id), eq(servants.isActive, true)),
    with: {
      sector: { with: { ministry: true } },
    },
  });

  const activeMemberships = memberships.filter(
    (m) => m.sector.isActive && m.sector.ministry.isActive,
  );
  if (activeMemberships.length === 0) {
    return {
      notificationsEnabled: me.notificationsEnabled,
      notifications: [],
      unreadCount: 0,
      vapidPublicKey: vapid.publicKey,
    };
  }

  const readRows = await db
    .select({ key: servantNotificationReads.notificationKey })
    .from(servantNotificationReads)
    .where(eq(servantNotificationReads.userId, session.user.id));
  const readSet = new Set(readRows.map((r) => r.key));

  const servantIds = activeMemberships.map((m) => m.id);
  const sentLogs =
    servantIds.length > 0
      ? await db
          .select({
            dateId: notificationLog.dateId,
            servantId: notificationLog.servantId,
            kind: notificationLog.kind,
            sentAt: notificationLog.sentAt,
          })
          .from(notificationLog)
          .where(
            and(
              inArray(notificationLog.servantId, servantIds),
              eq(notificationLog.status, "sent"),
            ),
          )
      : [];

  const sentLogMap = new Map<string, Date>();
  for (const log of sentLogs) {
    if (log.dateId) {
      sentLogMap.set(`${log.kind}:${log.dateId}:${log.servantId}`, log.sentAt);
    }
  }

  // Data atual e amanhã no fuso de São Paulo para gerar lembretes de véspera/dia
  const nowSp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const todayIso = `${nowSp.getFullYear()}-${String(nowSp.getMonth() + 1).padStart(2, "0")}-${String(nowSp.getDate()).padStart(2, "0")}`;
  const tomorrowDate = new Date(nowSp.getFullYear(), nowSp.getMonth(), nowSp.getDate() + 1);
  const tomorrowIso = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

  const greeting = `Olá, ${primeiroNome(me.name)}!`;
  const items: ServantNotificationItem[] = [];

  for (const servant of activeMemberships) {
    const sectorSchedules = await db.query.schedules.findMany({
      where: and(
        eq(schedules.sectorId, servant.sectorId),
        eq(schedules.status, "published"),
      ),
      with: {
        ministry: true,
        sector: true,
        dates: {
          with: {
            assignments: {
              where: (a, { eq: eqOp }) => eqOp(a.servantId, servant.id),
            },
          },
        },
      },
    });

    for (const s of sectorSchedules) {
      const publishedAt = (s.publishedAt ?? s.createdAt).toISOString();
      const periodo = periodoEscala(s.dates);
      const pubKey = `published:${s.id}:${servant.id}`;
      const pubVerse = pickVerse(`${s.id}:${servant.id}:published`);
      const pubHeadline = `A escala ${s.name} já está aberta${periodo}.`;

      items.push({
        key: pubKey,
        kind: "schedule_published",
        title: `Escala aberta: ${s.name}`,
        preview: `${greeting} ${pubHeadline} Informe os dias em que você pode servir.`,
        ministryName: s.ministry.name,
        sectorName: s.sector.name,
        scheduleName: s.name,
        scheduleShareLink: s.shareLink,
        servantId: servant.id,
        greeting,
        headline: pubHeadline,
        details: [
          { label: "Ministério", value: s.ministry.name },
          { label: "Setor", value: s.sector.name },
        ],
        callToActionText: "Informe os dias em que você pode servir:",
        verse: pubVerse,
        createdAt: publishedAt,
        read: readSet.has(pubKey),
      });

      for (const d of s.dates) {
        const isConfirmed = d.assignments.length > 0;
        if (!isConfirmed) continue;

        const cleanDate = d.date.slice(0, 10);
        const hora = d.startTime.slice(0, 5);
        const assignKey = `assigned:${d.id}:${servant.id}`;
        const dayBeforeVerse = pickVerse(`${d.id}:${servant.id}:day_before`);
        const twoHoursVerse = pickVerse(`${d.id}:${servant.id}:two_hours`, dayBeforeVerse);

        const baseDetails = [
          ...(d.title ? [{ label: "Evento", value: d.title }] : []),
          { label: "Escala", value: s.name },
          { label: "Ministério", value: s.ministry.name },
          { label: "Setor", value: s.sector.name },
        ];

        const assignHeadline = `Você está escalado(a) para servir em ${dataPorExtenso(cleanDate)} (${diaMes(cleanDate)}), às ${hora}.`;
        items.push({
          key: assignKey,
          kind: "assigned",
          title: `Você foi escalado(a) · ${diaMes(cleanDate)} às ${hora}`,
          preview: `${greeting} ${assignHeadline}`,
          ministryName: s.ministry.name,
          sectorName: s.sector.name,
          scheduleName: s.name,
          scheduleShareLink: s.shareLink,
          servantId: servant.id,
          serviceDate: cleanDate,
          serviceTime: hora,
          dateTitle: d.title,
          greeting,
          headline: assignHeadline,
          details: baseDetails,
          callToActionText: "Para mais detalhes, confira sua agenda no calendário.",
          verse: dayBeforeVerse,
          createdAt: publishedAt,
          read: readSet.has(assignKey),
        });

        // Lembrete de véspera (amanhã ou já enviado pelo worker do WhatsApp)
        const dayBeforeKey = `day_before:${d.id}:${servant.id}`;
        const dayBeforeSentAt = sentLogMap.get(dayBeforeKey);
        if (cleanDate === tomorrowIso || dayBeforeSentAt) {
          const remHeadline = `Você está escalado(a) amanhã (${diaMes(cleanDate)}), às ${hora}.`;
          items.push({
            key: dayBeforeKey,
            kind: "day_before",
            title: `Lembrete: você serve amanhã às ${hora}`,
            preview: `${greeting} ${remHeadline}${d.title ? ` · ${d.title}` : ""}`,
            ministryName: s.ministry.name,
            sectorName: s.sector.name,
            scheduleName: s.name,
            scheduleShareLink: s.shareLink,
            servantId: servant.id,
            serviceDate: cleanDate,
            serviceTime: hora,
            dateTitle: d.title,
            greeting,
            headline: remHeadline,
            details: baseDetails,
            callToActionText: "Para mais detalhes, confira sua agenda no calendário.",
            verse: dayBeforeVerse,
            createdAt: (dayBeforeSentAt ?? new Date()).toISOString(),
            read: readSet.has(dayBeforeKey),
          });
        }

        // Lembrete do próprio dia (hoje ou já enviado pelo worker do WhatsApp)
        const twoHoursKey = `two_hours:${d.id}:${servant.id}`;
        const twoHoursSentAt = sentLogMap.get(twoHoursKey);
        if (cleanDate === todayIso || twoHoursSentAt) {
          const todayHeadline = `Você está escalado(a) hoje (${diaMes(cleanDate)}), às ${hora}.`;
          items.push({
            key: twoHoursKey,
            kind: "two_hours",
            title: `Lembrete de hoje: culto às ${hora}`,
            preview: `${greeting} ${todayHeadline}${d.title ? ` · ${d.title}` : ""}`,
            ministryName: s.ministry.name,
            sectorName: s.sector.name,
            scheduleName: s.name,
            scheduleShareLink: s.shareLink,
            servantId: servant.id,
            serviceDate: cleanDate,
            serviceTime: hora,
            dateTitle: d.title,
            greeting,
            headline: todayHeadline,
            details: baseDetails,
            callToActionText: "Bom serviço hoje! Confira os detalhes no seu calendário.",
            verse: twoHoursVerse,
            createdAt: (twoHoursSentAt ?? new Date()).toISOString(),
            read: readSet.has(twoHoursKey),
          });
        }
      }
    }
  }

  // Não lidas primeiro, depois por data mais recente
  items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const dateA = a.serviceDate ?? a.createdAt;
    const dateB = b.serviceDate ?? b.createdAt;
    return dateB.localeCompare(dateA);
  });

  const unreadCount = items.filter((i) => !i.read).length;

  return {
    notificationsEnabled: me.notificationsEnabled,
    notifications: items,
    unreadCount,
    vapidPublicKey: vapid.publicKey,
  };
}

export async function updateOwnNotificationsEnabled(enabled: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await db
    .update(users)
    .set({ notificationsEnabled: Boolean(enabled) })
    .where(eq(users.id, session.user.id));

  revalidatePath("/servant");
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const endpoint = input.endpoint?.trim();
  const p256dh = input.p256dh?.trim();
  const auth = input.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Inscrição de Web Push inválida");
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh,
      auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: session.user.id,
        p256dh,
        auth,
      },
    });
}

export async function removePushSubscription(endpoint: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");
  const clean = endpoint?.trim();
  if (!clean) return;

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, clean),
      ),
    );
}

export async function sendTestPushNotification(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const firstName = primeiroNome(session.user.name ?? "Servo");
  return await sendWebPushToUsers([session.user.id], {
    title: "ScaleFlow · Notificações ativas!",
    body: `Olá, ${firstName}! Seus avisos de escala já estão configurados para aparecer na tela do seu aparelho.`,
    url: "/servant?aba=notifications",
    tag: "scaleflow-test",
  });
}

export async function markServantNotificationAsRead(notificationKey: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");
  const cleanKey = notificationKey.trim();
  if (!cleanKey) return;

  await db
    .insert(servantNotificationReads)
    .values({
      userId: session.user.id,
      notificationKey: cleanKey,
    })
    .onConflictDoNothing();

  revalidatePath("/servant");
}

export async function markAllServantNotificationsAsRead(notificationKeys: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const uniqueKeys = [...new Set(notificationKeys.map((k) => k.trim()).filter(Boolean))];
  if (uniqueKeys.length === 0) return;

  await db
    .insert(servantNotificationReads)
    .values(
      uniqueKeys.map((key) => ({
        userId: session.user.id,
        notificationKey: key,
      })),
    )
    .onConflictDoNothing();

  revalidatePath("/servant");
}
