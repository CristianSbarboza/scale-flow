import { cn } from "@/lib/cn";

/**
 * Superfície padrão do app.
 *
 * Envolve as classes `.card` e `.glass` do design system em vez de redeclarar
 * os valores — assim continua existindo uma definição só do visual, e o
 * componente é apenas a API para ela.
 *
 * `accent` desenha a barra colorida à esquerda usada nos cards de número.
 */
export default function Card({
  children,
  glass = false,
  accent,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  glass?: boolean;
  accent?: "primary" | "success" | "destructive";
}) {
  return (
    <div
      className={cn(
        "card",
        glass && "glass",
        accent === "primary" && "border-l-[3px] border-l-primary",
        accent === "success" && "border-l-[3px] border-l-success",
        accent === "destructive" && "border-l-[3px] border-l-destructive",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
