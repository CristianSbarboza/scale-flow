"use client";

import { cn } from "@/lib/cn";

/**
 * Botão do menu que vira X quando aberto.
 *
 * São três barras posicionadas em cima uma da outra: as das pontas giram para
 * formar o X e a do meio some. Por serem transforms, a transição é fluida —
 * trocar um ícone por outro só piscaria.
 */
export default function MenuToggle({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  const bar = "absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      className={cn("btn btn-ghost p-2", className)}
    >
      <span className="relative block h-4 w-5">
        <span className={cn(bar, open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0")} />
        <span className={cn(bar, "top-1/2 -translate-y-1/2", open && "opacity-0")} />
        <span className={cn(bar, open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-full -translate-y-full")} />
      </span>
    </button>
  );
}
