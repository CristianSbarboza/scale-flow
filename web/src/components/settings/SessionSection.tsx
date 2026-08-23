"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Button from "@/components/ui/Button";
import SettingsSection from "@/components/ui/SettingsSection";

/** Encerrar sessão. Bloco em tom destrutivo por ser ação de saída. */
export default function SessionSection() {
  return (
    <SettingsSection title="Sessão" icon={<LogOut size={14} />} tone="destructive">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Encerre sua sessão neste dispositivo.</p>
        <Button variant="danger" onClick={() => signOut()}>
          <LogOut size={18} /> Sair da Conta
        </Button>
      </div>
    </SettingsSection>
  );
}
