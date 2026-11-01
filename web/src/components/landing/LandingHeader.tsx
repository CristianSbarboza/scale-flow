"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/Providers";

export default function LandingHeader() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();

  const isLight = theme === "light" || theme === "jess";
  const toggleTheme = () => {
    setTheme(isLight ? "dark" : "light");
  };

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const appHref = isAuthenticated
    ? session?.user.role === "servant"
      ? "/servant"
      : "/admin"
    : "/login";

  return (
    <>
      <a
        href="#ideia"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Pular para a história
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a
            href="#topo"
            aria-label="ScaleFlow, voltar ao topo"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={32}
              height={32}
              priority
              className="rounded-lg border border-card-border"
            />
            <span className="font-logo text-lg tracking-wider text-primary">
              ScaleFlow
            </span>
          </a>

          <nav
            aria-label="Seções da página"
            className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
          >
            <a href="#ideia" className="transition-colors hover:text-foreground">
              A ideia
            </a>
            <a href="#perfis" className="transition-colors hover:text-foreground">
              Perfis
            </a>
            <a href="#momentos" className="transition-colors hover:text-foreground">
              Momentos
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              Perguntas
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
              title={isLight ? "Tema escuro" : "Tema claro"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <Link
              href={appHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:-translate-y-0.5 sm:text-sm"
            >
              <span>{isAuthenticated ? "Abrir painel" : "Entrar no app"}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

