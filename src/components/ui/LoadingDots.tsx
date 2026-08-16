import { cn } from "@/lib/cn";

const sizes = {
  sm: "size-1.5",
  md: "size-2",
} as const;

/**
 * Três pontinhos em onda, para o intervalo entre abrir a tela e os dados
 * chegarem. Cada um sobe e desce, e o atraso entre eles faz a onda correr.
 *
 * Herda a cor do texto do pai, então basta envolvê-lo em algo com
 * `text-muted-foreground` para deixá-lo discreto.
 */
export default function LoadingDots({
  size = "md",
  label = "Carregando",
  className,
}: {
  size?: keyof typeof sizes;
  /** Anunciado por leitores de tela; não aparece na tela. */
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("animate-dot-snake rounded-full bg-current", sizes[size])}
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </span>
  );
}
