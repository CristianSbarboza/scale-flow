"use client";

import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
}

/**
 * Seletor de uma opção entre poucas, no formato de pílulas lado a lado.
 * Usado no /login para escolher o tipo de conta.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-0.25rem)] p-2 text-[0.8125rem] font-semibold transition-all",
              isActive ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground",
            )}
          >
            {Icon && <Icon size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
