import { cn } from "@/lib/cn";

/**
 * Rótulo de seção — o texto pequeno, maiúsculo e apagado que abre um bloco.
 *
 * Existia como `sectionLabelStyle`, copiado byte a byte em cinco arquivos.
 */
export default function SectionLabel({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "h2" | "h3";
}) {
  return (
    <Tag className={cn("text-xs font-bold uppercase tracking-[0.03em] text-muted-foreground", className)}>
      {children}
    </Tag>
  );
}
