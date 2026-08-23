import { cn } from "@/lib/cn";

const tones = {
  success: "border-success bg-success/10 text-success",
  destructive: "border-destructive bg-destructive/10 text-destructive",
  primary: "border-primary bg-primary/10 text-primary",
} as const;

export type AlertTone = keyof typeof tones;

/**
 * Caixa de aviso: a mensagem em bloco, com fundo suave e borda da mesma cor.
 *
 * Estava escrita à mão em pelo menos quatro telas, sempre com o mesmo
 * `rgba(16, 185, 129, 0.1)` digitado de novo.
 */
export default function Alert({
  children,
  tone = "success",
  className,
}: {
  children: React.ReactNode;
  tone?: AlertTone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
