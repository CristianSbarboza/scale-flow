"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { AVATAR_ICONS, type AvatarIconKey } from "@/lib/avatarIcons";
import { cn } from "@/lib/cn";

/**
 * Grade de ícones do círculo de perfil. Vive num portal pelo mesmo motivo do
 * ColorPicker: abre por cima do modal de configurações, e o `overflow` do
 * corpo rolável cortaria a grade.
 */
export default function AvatarIconPicker({
  value,
  onConfirm,
  onClose,
}: {
  value: AvatarIconKey | null;
  onConfirm: (icon: AvatarIconKey | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const conteudo = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher ícone de perfil"
        onClick={(e) => e.stopPropagation()}
        className="card glass w-full max-w-[340px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base">Ícone de perfil</h3>
          <Button variant="ghost" className="rounded-full p-1.5" type="button" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(AVATAR_ICONS) as AvatarIconKey[]).map((key) => {
            const { label, Icon } = AVATAR_ICONS[key];
            const isActive = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onConfirm(key)}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl border-2 bg-muted text-muted-foreground transition-colors hover:border-primary/50",
                  isActive ? "border-primary text-primary" : "border-transparent",
                )}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        <Button variant="ghost" className="mt-4 w-full" onClick={() => onConfirm(null)}>
          Usar iniciais
        </Button>
      </div>
    </div>
  );

  return createPortal(conteudo, document.body);
}
