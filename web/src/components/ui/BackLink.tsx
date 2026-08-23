import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Link de "voltar" no topo de uma tela de detalhe.
 *
 * Existia como `backLinkStyle`, copiado em três telas de detalhe do admin.
 */
export default function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}
