"use client";

import { Filter } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Seletor de filtro no formato de pílula, com o funil dentro. Irmão do
 * SearchInput — os dois moram lado a lado na barra dos painéis de lista.
 */
export default function FilterSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Nome do filtro para leitores de tela. Não aparece na tela. */
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-[1_1_160px] items-center rounded-lg border border-border bg-muted px-3 py-1",
        "focus-within:border-primary",
        className,
      )}
    >
      <Filter size={14} className="mr-2 shrink-0 text-muted-foreground" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-none bg-transparent py-2 text-sm text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
