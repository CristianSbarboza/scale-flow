"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * O X que fecha um modal.
 *
 * Estava escrito à mão em quatro lugares, sempre como
 * `className="btn btn-ghost"` com `borderRadius: "50%"` e `padding: "0.5rem"`
 * inline — e num deles sem `aria-label`, então o leitor de tela anunciava um
 * botão sem nome.
 */
export default function CloseButton({
  onClick,
  label = "Fechar",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("btn btn-ghost rounded-full p-2", className)}
    >
      <X size={18} />
    </button>
  );
}
