import { cn } from "@/lib/cn";

/**
 * Moldura de um campo de formulário: rótulo em cima, controle no meio, dica ou
 * erro embaixo. Compartilhada por Field, SelectField e TextareaField para que
 * os três fiquem idênticos por construção, e não por coincidência.
 */
export default function FieldShell({
  id,
  label,
  hideLabel = false,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  /** Esconde o rótulo da vista, mantendo-o para leitores de tela. */
  hideLabel?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-2", className)}>
      <label htmlFor={id} className={cn("wrap-break-word", hideLabel && "sr-only")}>{label}</label>
      {children}
      {hint && !error && <p className="wrap-break-word text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="wrap-break-word text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
