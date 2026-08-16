"use client";

import { useSession } from "next-auth/react";
import ProfileSection from "@/components/settings/ProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import PasswordSection from "@/components/settings/PasswordSection";
import SessionSection from "@/components/settings/SessionSection";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  leader: "Líder",
  servant: "Servo",
};

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <div className="animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu perfil, aparência e segurança.</p>
      </header>

      <div className="grid max-w-[640px] gap-6">
        <ProfileSection
          name={session.user.name ?? ""}
          subtitle={session.user.email}
          badge={ROLE_LABELS[session.user.role] ?? session.user.role}
        />
        <AppearanceSection />
        <PasswordSection />
        <SessionSection />
      </div>
    </div>
  );
}
