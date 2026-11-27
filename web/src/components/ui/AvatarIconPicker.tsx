"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  AVATAR_ICONS,
  AVATAR_ICON_CATEGORIES,
  type AvatarIconCategoryKey,
  type AvatarIconKey,
} from "@/lib/avatarIcons";
import { cn } from "@/lib/cn";

/**
 * Grade de ícones do círculo de perfil separada por categorias.
 * Vive num portal pelo mesmo motivo do ColorPicker: abre por cima do modal
 * de configurações, e o `overflow` do corpo rolável cortaria a grade.
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
  const initialCategory: AvatarIconCategoryKey =
    value && AVATAR_ICONS[value] ? AVATAR_ICONS[value].category : "default";

  const [activeCategory, setActiveCategory] =
    useState<AvatarIconCategoryKey>(initialCategory);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categoryKeys = (Object.keys(AVATAR_ICONS) as AvatarIconKey[]).filter(
    (key) => AVATAR_ICONS[key].category === activeCategory,
  );

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
        className="card glass flex max-h-[85dvh] w-full max-w-[400px] flex-col overflow-hidden"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="text-base">Ícone de perfil</h3>
          <Button
            variant="ghost"
            className="rounded-full p-1.5"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Categorias */}
        <div className="mb-4 flex shrink-0 flex-wrap gap-1.5">
          {AVATAR_ICON_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Grade de Ícones da Categoria */}
        <div className="grid grid-cols-5 gap-2.5 overflow-y-auto pr-0.5">
          {categoryKeys.map((key) => {
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
                  "flex aspect-square flex-col items-center justify-center rounded-xl border-2 bg-muted text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
                  isActive
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-transparent",
                )}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          className="mt-4 w-full shrink-0"
          onClick={() => onConfirm(null)}
        >
          Usar iniciais
        </Button>
      </div>
    </div>
  );

  return createPortal(conteudo, document.body);
}
