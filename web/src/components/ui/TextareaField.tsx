"use client";

import { useId } from "react";
import FieldShell from "@/components/ui/FieldShell";
import { cn } from "@/lib/cn";

/** Campo de texto longo. Irmão do Field, mesma moldura. */
export default function TextareaField({
  label,
  error,
  hint,
  className,
  id,
  rows = 2,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
}) {
  const generated = useId();
  const areaId = id ?? generated;

  return (
    <FieldShell id={areaId} label={label} error={error} hint={hint}>
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-error` : undefined}
        className={cn("input", error && "border-destructive", className)}
        {...rest}
      />
    </FieldShell>
  );
}
