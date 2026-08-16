import { cn } from "@/lib/cn";

/**
 * Linha de lista dentro de um Panel: algo à esquerda (avatar, ícone), o nome
 * com uma legenda embaixo, e algo à direita (data, etiqueta, botão).
 *
 * O bloco estava repetido treze vezes em oito arquivos, sempre com o mesmo
 * `padding: 0.75rem` e a mesma borda inferior.
 */
export default function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  className,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-border p-3", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div>}
    </div>
  );
}
