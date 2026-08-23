"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Campo de busca no formato de pílula, com a lupa dentro.
 *
 * Estava escrito à mão nas quatro telas de lista do admin, sempre com o mesmo
 * fundo `--muted` e a mesma borda.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Pesquisar...",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
      <Search size={16} className="mr-2 shrink-0 text-muted-foreground" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-none bg-transparent py-2 text-sm text-foreground outline-none"
      />
    </div>
  );
}
