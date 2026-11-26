"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface BaseProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  active?: boolean;
  /** Sidebar recolhida: esconde o rótulo e centraliza o ícone. */
  collapsed?: boolean;
  className?: string;
}

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
    "btn group relative w-full overflow-hidden rounded-xl border-b-2 bg-transparent transition-all duration-200 active:scale-[0.98]",
    collapsed ? "justify-center px-0 py-3" : "justify-start px-4 py-2.5",
    active
      ? "border-b-primary bg-primary/10 text-primary"
      : "border-b-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    className,
  );

  const content = (
    <>
      <motion.span
        animate={{ scale: active ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
        className="inline-flex shrink-0"
      >
        <Icon size={20} className="min-w-5" />
      </motion.span>
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
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </button>
  );
}
