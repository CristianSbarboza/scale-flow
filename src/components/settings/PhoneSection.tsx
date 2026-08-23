"use client";

import { useEffect, useState } from "react";
import { Phone, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import PhoneField from "@/components/ui/PhoneField";
import SettingsSection from "@/components/ui/SettingsSection";
import { getOwnPhone, updateOwnPhone } from "@/lib/actions/account";
import { useToast } from "@/components/Toast";

/**
 * Telefone da própria conta. Vale para todos os papéis — está na página de
 * configurações do admin e no modal do servo, que compartilham as seções.
 *
 * Carrega o valor por conta própria em vez de receber por prop: a sessão do
 * next-auth não carrega telefone, e colocá-lo lá deixaria o campo defasado
 * até o próximo login.
 */
export default function PhoneSection() {
  const { showToast } = useToast();
  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let vivo = true;
    getOwnPhone()
      .then((value) => {
        if (!vivo) return;
        setPhone(value);
        setSaved(value);
      })
      .catch(() => showToast("Não foi possível carregar seu telefone.", "error"))
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOwnPhone(phone);
      setSaved(phone);
      showToast(phone ? "Telefone atualizado." : "Telefone removido.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar o telefone.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Telefone" icon={<Phone size={14} />}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* O componente monta a partir do valor carregado, então só é
              renderizado depois — senão nasceria vazio e assim ficaria. */}
          <PhoneField
            label="Seu telefone"
            value={phone}
            onChange={setPhone}
            hint="Opcional. Usado para contato do seu líder."
          />
          <Button type="submit" disabled={saving || phone === saved} className="justify-self-start">
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Telefone"}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
