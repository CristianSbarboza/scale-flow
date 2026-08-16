"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { X, Settings, KeyRound, Save, User, Sun, Moon, Palette, LogOut, Check } from "lucide-react";
import { changeOwnPassword, updateOwnColor } from "@/lib/actions/account";
import { useTheme } from "@/components/Providers";
import { useToast } from "@/components/Toast";

interface Props {
  name: string;
  sectorName: string;
  color: string | null;
  onClose: () => void;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

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

export default function SettingsModal({ name, sectorName, color, onClose }: Props) {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [showStyler, setShowStyler] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const [savingColor, setSavingColor] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePickColor = async (value: string | null) => {
    setSavingColor(value ?? "__default__");
    try {
      await updateOwnColor(value);
      setCurrentColor(value);
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast("Erro ao salvar a cor.", "error");
    } finally {
      setSavingColor(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card glass"
        style={{ width: "100%", maxWidth: "420px", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={18} color="var(--primary)" />
            <h3 style={{ fontSize: "1.125rem" }}>Configurações</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0, display: "grid", gap: "1.5rem" }}>
          {/* Perfil */}
          <div>
            <p style={{ ...sectionLabelStyle, marginBottom: "0.75rem" }}>Perfil</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: currentColor || "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, flexShrink: 0 }}>
                {name.charAt(0) || <User size={22} />}
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{sectorName}</p>
              </div>
            </div>
          </div>

          {/* Aparência */}
          <div>
            <p style={{ ...sectionLabelStyle, marginBottom: "0.75rem" }}>Aparência</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Tema do sistema</p>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 0.875rem", fontSize: "0.8125rem" }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </button>
            </div>
          </div>

          {/* Estilizar Painel */}
          <div>
            <button
              type="button"
              onClick={() => setShowStyler((v) => !v)}
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              <Palette size={16} /> Estilizar Painel
            </button>
            {showStyler && (
              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "0.75rem" }}>
                  Escolha a cor do seu círculo nos dias confirmados. Essa cor também aparece como destaque nos seus dias na agenda de outros servos.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {COLOR_OPTIONS.map((opt) => {
                    const isActive = currentColor === opt.value;
                    const isSaving = savingColor === (opt.value ?? "__default__");
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handlePickColor(opt.value)}
                        disabled={isSaving}
                        title={opt.label}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: opt.swatch,
                          border: isActive ? "3px solid var(--foreground)" : "3px solid transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          cursor: "pointer",
                        }}
                      >
                        {isActive && <Check size={16} color="white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Segurança */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <KeyRound size={14} color="var(--muted-foreground)" />
              <p style={sectionLabelStyle}>Alterar Senha</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
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
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} />
                {loading ? "Salvando..." : "Salvar Nova Senha"}
              </button>
            </form>
          </div>

          {/* Sessão */}
          <div className="card" style={{ border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Encerrar sessão neste dispositivo</p>
              <button
                type="button"
                onClick={() => signOut()}
                className="btn"
                style={{ background: "#ef4444", color: "white" }}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
