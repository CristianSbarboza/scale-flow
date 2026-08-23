"use client";

import { cn } from "@/lib/cn";

const tones = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
} as const;

/**
 * Botão só de ícone das linhas de tabela: editar, copiar, excluir, ver.
 *
 * `label` é obrigatório e vira `title` e `aria-label` ao mesmo tempo — os
 * botões originais tinham só `title`, que leitor de tela nem sempre anuncia.
 */
export default function IconButton({
  label,
  tone = "default",
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string;
  tone?: keyof typeof tones;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "rounded-lg p-1.5 transition-colors hover:bg-muted",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
