import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, churches } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
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

        let user;

        if (credentials.username) {
          if (!credentials.church) return null;

          const church = await db.query.churches.findFirst({
            where: eq(churches.username, credentials.church.trim().toLowerCase()),
          });
          if (!church) return null;

          // Minúsculo dos dois lados: o banco guarda normalizado, e quem
          // digita "Joao.Silva" no celular (com a primeira maiúscula
          // automática) precisa entrar do mesmo jeito.
          user = await db.query.users.findFirst({
            where: and(
              eq(users.username, credentials.username.trim().toLowerCase()),
              eq(users.churchId, church.id)
            ),
          });
        } else if (credentials.email) {
          // Mesmo motivo do username: e-mail é case-insensitive na prática, e
          // o cadastro grava minúsculo.
          user = await db.query.users.findFirst({
            where: eq(users.email, credentials.email.trim().toLowerCase()),
          });
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
    })
  ],
  callbacks: {
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
