import { cn } from "@/lib/cn";

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  /** Sem fundo, marcado pela borda. O neutro para ação secundária. */
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
} as const;

export type ButtonVariant = keyof typeof variants;

/**
 * Botão padrão. Envolve `.btn` + `.btn-*` do design system.
 *
 * `disabled` ganha o tratamento visual aqui porque as telas vinham
 * improvisando `opacity` no style inline, cada uma com um valor.
 */
export default function Button({
  variant = "primary",
  className,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        variants[variant],
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        className,
      )}
      {...rest}
    />
  );
}
