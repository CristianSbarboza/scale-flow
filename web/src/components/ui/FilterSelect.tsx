"use client";

import { Filter } from "lucide-react";
import Select from "@/components/ui/Select";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Filtro da barra dos painéis de lista. É o Select do design system com o
 * funil na frente — irmão do SearchInput, que mora ao lado dele.
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
    <Select
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      leading={<Filter size={14} className="shrink-0 text-muted-foreground" />}
      className={className}
    />
  );
}
