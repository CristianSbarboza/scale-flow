"use client";

import { useId } from "react";
import FieldShell from "@/components/ui/FieldShell";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * Campo de seleção. Irmão do Field, mesma moldura.
 *
 * `placeholder` vira a primeira opção, de valor vazio — o padrão que as telas
 * já usavam com "Selecione um ministério", só que escrito à mão em cada uma.
 */
export default function SelectField({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  options: SelectOption[];
  placeholder?: string;
}) {
  const generated = useId();
  const selectId = id ?? generated;

  return (
    <FieldShell id={selectId} label={label} error={error} hint={hint}>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn("input", error && "border-destructive", className)}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
