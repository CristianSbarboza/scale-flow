"use client";

import { cn } from "@/lib/cn";

/**
 * Interruptor liga/desliga.
 *
 * Substitui a estrela que marcava coordenador de setor: a estrela não dizia se
 * estava ligada ou desligada sem a pessoa já saber o que a cor significava, e
 * o mesmo clique servia para os dois sentidos. Um interruptor mostra o estado
 * na posição, que é o ponto dele.
 *
 * `role="switch"` com `aria-checked` é o que faz leitor de tela anunciar
 * "ligado"/"desligado" — um `<button>` puro anunciaria só o nome.
 */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Descrição para leitor de tela e para o `title`. Não aparece ao lado. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        checked ? "bg-primary" : "bg-muted-foreground/30",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
