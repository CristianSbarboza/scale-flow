"use client";

import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import PasswordField from "@/components/ui/PasswordField";
import SettingsSection from "@/components/ui/SettingsSection";
import { changeOwnPassword } from "@/lib/actions/account";
import { useToast } from "@/components/Toast";

/**
 * Troca de senha. O formulário era o mesmo na tela do admin e no modal do
 * servo, incluindo a checagem de confirmação e as mensagens.
 */
export default function PasswordSection() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("As senhas não coincidem.", "error");
      return;
    }
    setLoading(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      showToast("Senha alterada com sucesso.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao alterar senha.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection title="Segurança" icon={<KeyRound size={14} />}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <PasswordField
          label="Senha atual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <PasswordField
          label="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <PasswordField
          label="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="justify-self-start">
          <Save size={16} />
          {loading ? "Salvando..." : "Salvar Nova Senha"}
        </Button>
      </form>
    </SettingsSection>
  );
}
