import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHmac, randomBytes } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { isGoogleOAuthConfigured } from "@/lib/google-calendar";

const STATE_COOKIE = "scaleflow_google_oauth_state";

export function signOAuthState(payload: object): string {
  const secret = process.env.NEXTAUTH_SECRET || "scaleflow-fallback-secret";
  const data = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const returnToParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/") && !returnToParam.startsWith("//")
      ? returnToParam
      : session.user.role === "servant"
        ? "/servant"
        : "/admin/settings";

  if (!isGoogleOAuthConfigured()) {
    const errUrl = new URL(returnTo, req.nextUrl.origin);
    errUrl.searchParams.set("google", "unconfigured");
    return NextResponse.redirect(errUrl);
  }

  const nonce = randomBytes(16).toString("hex");
  const state = signOAuthState({
    userId: session.user.id,
    returnTo,
    nonce,
    exp: Date.now() + 10 * 60 * 1000,
  });

  const redirectUri = `${req.nextUrl.origin}/api/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!.trim());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "openid email profile https://www.googleapis.com/auth/calendar.events",
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
