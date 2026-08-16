"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

interface BaseProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  active?: boolean;
  /** Sidebar recolhida: esconde o rótulo e centraliza o ícone. */
  collapsed?: boolean;
  className?: string;
}

/**
 * Item de navegação da sidebar.
 *
 * Existia em três cópias do mesmo bloco: os itens do menu do admin, o link de
 * Configurações logo abaixo (copy-paste do primeiro) e as abas do servo, que
 * são botões em vez de links.
 *
 * Aceita `href` (vira Link) ou `onClick` (vira button) — é a única diferença
 * real entre os três, e não valia dois componentes.
 */
type NavLinkProps =
  | (BaseProps & { href: string; onClick?: never })
  | (BaseProps & { onClick: () => void; href?: never });

export default function NavLink({
  icon: Icon,
  children,
  active = false,
  collapsed = false,
  className,
  href,
  onClick,
}: NavLinkProps) {
  const classes = cn(
    "btn w-full overflow-hidden rounded-none border-b-2 bg-transparent transition-all duration-200",
    collapsed ? "justify-center px-0 py-3" : "justify-start px-4 py-2.5",
    active
      ? "border-b-primary text-primary"
      : "border-b-transparent text-muted-foreground hover:text-foreground",
    className,
  );

  const content = (
    <>
      <Icon size={20} className="min-w-5" />
      {!collapsed && <span className="whitespace-nowrap">{children}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-current={active ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-current={active ? "page" : undefined}>
      {content}
    </button>
  );
}
