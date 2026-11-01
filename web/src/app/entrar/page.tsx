import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Ponto de entrada direto do aplicativo (usado como `start_url` no PWA).
 *
 * Mantém a raiz `/` 100% estática e indexável como site institucional, enquanto
 * quem abre o ícone instalado na tela inicial cai direto no próprio painel.
 */
export default async function EntrarRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role === "admin" || role === "leader") {
    redirect("/admin");
  }

  redirect("/servant");
}

