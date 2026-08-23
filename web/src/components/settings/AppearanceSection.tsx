"use client";

import { Sun, Moon, Palette } from "lucide-react";
import Button from "@/components/ui/Button";
import SettingsSection from "@/components/ui/SettingsSection";
import { useTheme } from "@/components/Providers";

/** Aparência: alternar entre tema claro e escuro. */
export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection title="Aparência" icon={<Palette size={14} />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.9375rem] font-semibold">Tema do sistema</p>
          <p className="text-[0.8125rem] text-muted-foreground">Alterne entre modo claro e escuro.</p>
        </div>
        <Button variant="secondary" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        </Button>
      </div>
    </SettingsSection>
  );
}
