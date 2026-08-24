"use client";

import { Sun, Moon, Heart, Palette } from "lucide-react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import SettingsSection from "@/components/ui/SettingsSection";
import { useTheme, type Theme } from "@/components/Providers";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Escuro" },
  { value: "light", label: "Claro" },
  { value: "amada", label: "Amada do Pai" },
];

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: <Moon size={16} className="shrink-0 text-muted-foreground" />,
  light: <Sun size={16} className="shrink-0 text-muted-foreground" />,
  amada: <Heart size={16} className="shrink-0 text-muted-foreground" />,
};

/**
 * Aparência: tema do sistema.
 *
 * O tema "Amada do Pai" é exclusivo do servo — por isso o seletor de 3 opções
 * só aparece para esse papel; admin e líder continuam com o botão simples de
 * alternar claro/escuro.
 */
export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const isServant = session?.user.role === "servant";

  return (
    <SettingsSection title="Aparência" icon={<Palette size={14} />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.9375rem] font-semibold">Tema do sistema</p>
          <p className="text-[0.8125rem] text-muted-foreground">
            {isServant ? "Escolha entre claro, escuro ou Amada do Pai." : "Alterne entre modo claro e escuro."}
          </p>
        </div>

        {isServant ? (
          <Select
            value={theme}
            onChange={(value) => setTheme(value as Theme)}
            options={THEME_OPTIONS}
            label="Tema do sistema"
            leading={THEME_ICONS[theme]}
            className="w-56 flex-none"
          />
        ) : (
          <Button variant="secondary" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
