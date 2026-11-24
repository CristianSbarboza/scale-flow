import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHmac, timingSafeEqual } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncUserScheduleToGoogleCalendar } from "@/lib/google-calendar";

const STATE_COOKIE = "scaleflow_google_oauth_state";

function verifyOAuthState(raw: string): {
  userId: string;
  returnTo: string;
  exp: number;
} | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = process.env.NEXTAUTH_SECRET || "scaleflow-fallback-secret";
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8"),
    ) as { userId: string; returnTo: string; exp: number };
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const fallbackReturn =
    session?.user?.role === "servant" ? "/servant" : "/admin/settings";

  const finishWithStatus = (returnPath: string, status: string) => {
    const url = new URL(returnPath, req.nextUrl.origin);
    url.searchParams.set("google", status);
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !stateParam || !cookieState || stateParam !== cookieState) {
    return finishWithStatus(fallbackReturn, "error");
  }

  const verified = verifyOAuthState(stateParam);
  if (!verified || verified.userId !== session.user.id) {
    return finishWithStatus(fallbackReturn, "error");
  }

  const redirectUri = `${req.nextUrl.origin}/api/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return finishWithStatus(verified.returnTo, "error");
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      return finishWithStatus(verified.returnTo, "error");
    }

    const profileRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    if (!profileRes.ok) {
      return finishWithStatus(verified.returnTo, "error");
    }

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
    };

    if (!profile.sub || !profile.email) {
      return finishWithStatus(verified.returnTo, "error");
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    // Verifica se esta conta Google já está vinculada a outro usuário
    const [existingGoogleOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.googleId, profile.sub));

    if (existingGoogleOwner && existingGoogleOwner.id !== session.user.id) {
      return finishWithStatus(verified.returnTo, "already_linked");
    }

    const [currentUser] = await db
      .select({
        email: users.email,
        googleRefreshToken: users.googleRefreshToken,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    // Se o usuário ainda não tinha e-mail na conta e o e-mail do Google estiver
    // livre, já preenche também o e-mail da conta para permitir login direto.
    let shouldSetAccountEmail = false;
    if (!currentUser?.email) {
      const [emailOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail));
      if (!emailOwner) {
        shouldSetAccountEmail = true;
      }
    }

    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in ?? 3500) * 1000,
    );

    await db
      .update(users)
      .set({
        googleId: profile.sub,
        googleEmail: normalizedEmail,
        googleAccessToken: tokenData.access_token,
        googleRefreshToken:
          tokenData.refresh_token ?? currentUser?.googleRefreshToken ?? null,
        googleTokenExpiresAt: expiresAt,
        googleCalendarSync: true,
        ...(shouldSetAccountEmail ? { email: normalizedEmail } : {}),
      })
      .where(eq(users.id, session.user.id));

    // Sincroniza imediatamente todas as escalações confirmadas com o Google Agenda
    await syncUserScheduleToGoogleCalendar(session.user.id);

    return finishWithStatus(verified.returnTo, "connected");
  } catch (error) {
    console.error("Erro no callback do Google OAuth:", error);
    return finishWithStatus(verified.returnTo, "error");
  }
}
