"use client";

import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Caixa que mostra uma senha recém-gerada, com botão de copiar.
 *
 * O sistema mostra a senha uma única vez, na hora em que cria a conta — daí o
 * destaque em cor de alerta. Estava escrita à mão em três telas (novo
 * ministério, novo servo e detalhe do ministério), cada uma com o seu próprio
 * estado de "copiado".
 */
export default function GeneratedPassword({
  password,
  title,
  description,
  className,
}: {
  password: string;
  title: string;
  description: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "mt-6 flex flex-col gap-3 rounded-lg border border-accent bg-accent/10 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-accent">
        <ShieldAlert size={18} />
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm">{description}</p>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-input px-4 py-2">
        <code className="text-lg text-accent">{password}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Senha copiada" : "Copiar senha"}
          className={cn("rounded-lg p-1.5 transition-colors hover:bg-muted", copied && "text-success")}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
}
