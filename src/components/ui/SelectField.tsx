"use client";

import { useId } from "react";
import FieldShell from "@/components/ui/FieldShell";
import Select from "@/components/ui/Select";

export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * Campo de seleção dos formulários. Usa o Select do design system, e não o
 * `<select>` nativo, para a lista abrir com a cara do app.
 *
 * O nativo continua no DOM, invisível e fora da ordem de tabulação, só para o
 * navegador seguir validando `required` no submit — trocar o controle não pode
 * custar a validação que vinha de graça. Quem lê a tela e quem navega por
 * teclado interage com o listbox; o nativo é só o guardião do submit.
 */
export default function SelectField({
  label,
  hideLabel,
  error,
  hint,
  options,
  placeholder,
  value,
  onChange,
  required,
  name,
  className,
}: {
  label: React.ReactNode;
  hideLabel?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  options: SelectOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  name?: string;
  className?: string;
}) {
  const id = useId();
  const items = [
    ...(placeholder ? [{ value: "", label: placeholder }] : []),
    ...options.map((o) => ({ value: String(o.value), label: o.label })),
  ];

  return (
    <FieldShell
      id={`${id}-trigger`}
      label={label}
      hideLabel={hideLabel}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        <Select
          value={value}
          onChange={onChange}
          options={items}
          label={typeof label === "string" ? label : "Seleção"}
        />
        <select
          aria-hidden
          tabIndex={-1}
          name={name}
          required={required}
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-0 size-full opacity-0"
        >
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
}
