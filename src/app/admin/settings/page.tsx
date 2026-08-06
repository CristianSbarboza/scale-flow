"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Sun, Moon, KeyRound, LogOut, Save } from "lucide-react";
import { useTheme } from "@/components/Providers";
import { changeOwnPassword } from "@/lib/actions";
import { useToast } from "@/components/Toast";

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  leader: "Líder de Ministério",
  servant: "Servo",
};

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("A confirmação não corresponde à nova senha.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("A nova senha deve ter ao menos 6 caracteres.", "error");
      return;
    }

    setLoading(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Senha alterada com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao alterar senha.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Configurações</h1>
        <p style={{ color: "var(--muted-foreground)" }}>Gerencie seu perfil, aparência e segurança.</p>
      </header>

      <div style={{ display: "grid", gap: "1.5rem", maxWidth: "640px" }}>
        <div className="card glass">
          <p style={{ ...sectionLabelStyle, marginBottom: "1rem" }}>Perfil</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "1.25rem", flexShrink: 0 }}>
              {session.user.name?.charAt(0) ?? <User size={24} />}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "1.0625rem" }}>{session.user.name}</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{session.user.email}</p>
              <span style={{ display: "inline-block", marginTop: "0.375rem", fontSize: "0.6875rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "1rem", background: "var(--muted)", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {ROLE_LABELS[session.user.role] ?? session.user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="card glass">
          <p style={{ ...sectionLabelStyle, marginBottom: "1rem" }}>Aparência</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Tema do sistema</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>Alterne entre modo claro e escuro.</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn btn-secondary"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </button>
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <KeyRound size={14} color="var(--primary)" />
            <p style={sectionLabelStyle}>Segurança</p>
          </div>
          <form onSubmit={handleChangePassword} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Senha atual</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Nova senha</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Confirmar nova senha</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifySelf: "start" }}>
              <Save size={16} />
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </button>
          </form>
        </div>

        <div className="card glass" style={{ border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <LogOut size={14} color="#ef4444" />
            <p style={{ ...sectionLabelStyle, color: "#ef4444" }}>Sessão</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Encerre sua sessão neste dispositivo.</p>
            <button
              type="button"
              onClick={() => signOut()}
              className="btn"
              style={{ background: "#ef4444", color: "white" }}
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
