"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Campo de formulário: rótulo + input + erro, com o `htmlFor`/`id` já ligados.
 *
 * O id sai de `useId` porque as telas vinham escrevendo à mão e algumas
 * simplesmente não ligavam label e input.
 */
export default function Field({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
}) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn("input", error && "border-destructive", className)}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
