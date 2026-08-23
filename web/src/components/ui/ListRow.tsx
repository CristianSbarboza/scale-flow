import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Linha de lista dentro de um Panel: algo à esquerda (avatar, ícone), o nome
 * com uma legenda embaixo, e algo à direita (etiqueta, botão).
 *
 * O bloco estava repetido treze vezes em oito arquivos, sempre com o mesmo
 * `padding: 0.75rem` e a mesma borda inferior.
 *
 * Com `href` a linha inteira vira um link e ganha a seta que sinaliza isso —
 * a área de toque é a linha toda, não só o texto.
 */
export default function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  className,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div>}
      {href && <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    </>
  );

  const base = "flex items-center gap-3 border-b border-border p-3";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "-mx-3 px-3 transition-colors hover:bg-muted", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(base, className)}>{content}</div>;
}
