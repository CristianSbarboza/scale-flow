import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db";
import { users, churches } from "@/db/schema";
import { and, eq, like, or } from "drizzle-orm";
import { compare } from "bcryptjs";
import { syncUserScheduleToGoogleCalendar } from "@/lib/google-calendar";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        phone: { label: "Telefone", type: "text" },
        church: { label: "Igreja", type: "text" },
        username: { label: "Usuário", type: "text" },
        password: { label: "Password", type: "password" }
      },
      /**
       * Dois caminhos de identificação, por desenho:
       *
       * - **E-mail** (admin/líder): único no mundo, então basta ele.
       * - **Igreja + usuário** (servo): `maria` só é única dentro da igreja.
       *   Sem o username da igreja não dá para saber de qual `maria` se trata,
       *   e aceitar a primeira que aparecer deixaria o login virar loteria
       *   entre igrejas.
       *
       * Todos os fracassos retornam `null` sem distinguir o motivo. Dizer
       * "igreja não encontrada" transformaria a tela de login num jeito de
       * descobrir quais igrejas existem.
       */
      async authorize(credentials) {
        if (!credentials?.password) return null;

        const phoneDigits = (credentials.phone ?? "").replace(/\D/g, "");
        if (phoneDigits.length >= 8 && phoneDigits.length <= 15) {
          // Login por telefone: o banco guarda E.164 sem '+' (ex.: 5511987654321)
          // e o usuário digita apenas o número sem 55 e sem DDD (ex.: 987654321).
          let churchIdFilter: number | null = null;
          if (credentials.church?.trim()) {
            const [church] = await db
              .select({ id: churches.id })
              .from(churches)
              .where(eq(churches.username, credentials.church.trim().toLowerCase()));
            if (church) churchIdFilter = church.id;
          }

          const candidates = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              password: users.password,
              role: users.role,
              churchId: users.churchId,
            })
            .from(users)
            .where(
              and(
                like(users.phone, `%${phoneDigits}`),
                eq(users.isActive, true),
              ),
            );

          const ordered = churchIdFilter
            ? [
                ...candidates.filter((c) => c.churchId === churchIdFilter),
                ...candidates.filter((c) => c.churchId !== churchIdFilter),
              ]
            : candidates;

          for (const candidate of ordered) {
            const valid = await compare(credentials.password, candidate.password);
            if (valid) {
              return {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                role: candidate.role,
                churchId: candidate.churchId,
              };
            }
          }

          return null;
        }

        let user;

        if (credentials.username) {
          if (!credentials.church) return null;

          const [church] = await db
            .select({ id: churches.id })
            .from(churches)
            .where(eq(churches.username, credentials.church.trim().toLowerCase()));
          if (!church) return null;

          // Minúsculo dos dois lados: o banco guarda normalizado, e quem
          // digita "Joao.Silva" no celular (com a primeira maiúscula
          // automática) precisa entrar do mesmo jeito.
          [user] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              password: users.password,
              role: users.role,
              churchId: users.churchId,
            })
            .from(users)
            .where(
              and(
                eq(users.username, credentials.username.trim().toLowerCase()),
                eq(users.churchId, church.id),
              ),
            );
        } else if (credentials.email) {
          // Mesmo motivo do username: e-mail é case-insensitive na prática, e
          // o cadastro grava minúsculo.
          [user] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              password: users.password,
              role: users.role,
              churchId: users.churchId,
            })
            .from(users)
            .where(eq(users.email, credentials.email.trim().toLowerCase()));
        } else {
          return null;
        }

        if (!user) return null;

        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          churchId: user.churchId,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "unconfigured",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "unconfigured",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const googleId = account.providerAccountId;
        const email = profile?.email?.trim().toLowerCase() ?? null;
        if (!googleId) return "/login?error=GoogleNotLinked";

        // 1. Prioridade: usuário que já vinculou esta conta Google nas Configurações
        let [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId));

        // 2. Caso ainda não tenha vinculado pelo ID, permite entrar se o e-mail
        // já foi liberado/cadastrado previamente pelo administrador ou líder
        if (!dbUser && email) {
          [dbUser] = await db
            .select()
            .from(users)
            .where(or(eq(users.googleEmail, email), eq(users.email, email)));
        }

        if (!dbUser || !dbUser.isActive) {
          return "/login?error=GoogleNotLinked";
        }

        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : new Date(Date.now() + 3500 * 1000);

        await db
          .update(users)
          .set({
            googleId,
            ...(email ? { googleEmail: email } : {}),
            ...(account.access_token
              ? {
                  googleAccessToken: account.access_token,
                  googleTokenExpiresAt: expiresAt,
                }
              : {}),
            ...(account.refresh_token
              ? { googleRefreshToken: account.refresh_token }
              : {}),
          })
          .where(eq(users.id, dbUser.id));

        user.id = dbUser.id;
        user.name = dbUser.name;
        user.email = dbUser.email;
        user.role = dbUser.role;
        user.churchId = dbUser.churchId;

        void syncUserScheduleToGoogleCalendar(dbUser.id);
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.churchId = user.churchId;
      }

      /**
       * `update()` chamado no cliente cai aqui. Relemos o nome **do banco** em
       * vez de aceitar o que o cliente mandou junto: o payload do update é
       * controlado pelo navegador, e confiar nele deixaria qualquer um
       * reescrever o próprio nome na sessão sem passar pela action.
       *
       * Sem isto, quem troca o nome nas configurações continua vendo o antigo
       * até o próximo login — o nome mora no JWT.
       */
      if (trigger === "update" && token.id) {
        const [atual] = await db.select({ name: users.name })
          .from(users).where(eq(users.id, token.id));
        if (atual) token.name = atual.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.churchId = token.churchId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
