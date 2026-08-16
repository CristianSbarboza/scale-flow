import { cn } from "@/lib/cn";

const tones = {
  primary: "text-primary",
  success: "text-success",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
} as const;

const solidTones = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export type BadgeTone = keyof typeof tones;

/**
 * Etiqueta curta de estado: "Ativo", "Rascunho", "Privada".
 *
 * `solid` desenha o fundo suave; sem ele fica só o texto colorido, que é como
 * a maioria das telas já usava.
 */
export default function Badge({
  children,
  tone = "primary",
  solid = false,
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  solid?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.03em]",
        solid ? cn("rounded-lg px-2 py-1", solidTones[tone]) : tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
