"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette, Plus } from "lucide-react";
import ColorPicker from "@/components/ui/ColorPicker";
import SettingsSection from "@/components/ui/SettingsSection";
import { updateOwnColor } from "@/lib/actions/account";
import { cn } from "@/lib/cn";

const COLOR_OPTIONS: { label: string; value: string | null; swatch: string }[] = [
  { label: "Padrão", value: null, swatch: "#f97316" },
  { label: "Azul", value: "#3b82f6", swatch: "#3b82f6" },
  { label: "Verde", value: "#22c55e", swatch: "#22c55e" },
  { label: "Rosa", value: "#ec4899", swatch: "#ec4899" },
  { label: "Roxo", value: "#a855f7", swatch: "#a855f7" },
  { label: "Vermelho", value: "#ef4444", swatch: "#ef4444" },
  { label: "Ciano", value: "#06b6d4", swatch: "#06b6d4" },
  { label: "Amarelo", value: "#eab308", swatch: "#eab308" },
];

/** Cor do servo nos dias confirmados. Só existe para quem serve. */
export default function PanelStyleSection({ color }: { color: string | null }) {
  const router = useRouter();
  const [currentColor, setCurrentColor] = useState(color);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const ehPersonalizada =
    !!currentColor && !COLOR_OPTIONS.some((o) => o.value === currentColor);

  const escolher = async (value: string | null) => {
    setSaving(value ?? "__default__");
    try {
      await updateOwnColor(value);
      setCurrentColor(value);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <SettingsSection title="Estilizar Painel" icon={<Palette size={14} />}>
      <p className="mb-3 text-[0.8125rem] text-muted-foreground">
        Escolha a cor do seu círculo nos dias confirmados. Essa cor também aparece como destaque
        nos seus dias na agenda de outros servos.
      </p>

      <div className="flex flex-wrap gap-3">
        {COLOR_OPTIONS.map((opt) => {
          const isActive = currentColor === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => escolher(opt.value)}
              disabled={saving === (opt.value ?? "__default__")}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={isActive}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-[3px] shadow-md transition-transform hover:scale-105",
                isActive ? "border-foreground" : "border-transparent",
              )}
              style={{ background: opt.swatch }}
            >
              {isActive && <Check size={16} color="white" />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          title="Cor personalizada"
          aria-label="Escolher cor personalizada"
          className={cn(
            "flex size-10 items-center justify-center rounded-full border-[3px] transition-transform hover:scale-105",
            ehPersonalizada ? "border-foreground" : "border-transparent",
          )}
          style={{
            background: ehPersonalizada
              ? currentColor!
              : "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)",
          }}
        >
          <Plus size={16} color="white" strokeWidth={3} />
        </button>
      </div>

      {showPicker && (
        <ColorPicker
          value={currentColor ?? "#f97316"}
          onClose={() => setShowPicker(false)}
          onConfirm={(hex) => {
            setShowPicker(false);
            escolher(hex);
          }}
        />
      )}
    </SettingsSection>
  );
}
