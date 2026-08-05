"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Settings, KeyRound, Save } from "lucide-react";
import { changeOwnPassword } from "@/lib/actions";
import { useToast } from "@/components/Toast";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      showToast("Senha alterada com sucesso.", "success");
      onClose();
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
        style={{ width: "100%", maxWidth: "380px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={18} color="var(--primary)" />
            <h3 style={{ fontSize: "1.125rem" }}>Configurações</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <KeyRound size={14} color="var(--muted-foreground)" />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Alterar Senha
          </span>
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
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
            <Save size={16} />
            {loading ? "Salvando..." : "Salvar Nova Senha"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
