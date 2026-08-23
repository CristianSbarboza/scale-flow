"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IdCard, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PhoneField from "@/components/ui/PhoneField";
import SettingsSection from "@/components/ui/SettingsSection";
import { getOwnProfile, updateOwnProfile } from "@/lib/actions/account";
import { validateStoredPhone } from "@/lib/phone";
import { useToast } from "@/components/Toast";

/**
 * Nome e telefone da própria conta. Vale para todos os papéis — está na página
 * de configurações do admin e no modal do servo, que compartilham as seções.
 *
 * Carrega o valor por conta própria em vez de receber por prop: o telefone não
 * existe na sessão do next-auth, e o nome que existe lá fica defasado até o
 * `update()` — então a fonte é sempre o banco.
 */
export default function PersonalDataSection() {
  const { update } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<{ name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let vivo = true;
    getOwnProfile()
      .then((perfil) => {
        if (!vivo) return;
        setName(perfil.name);
        setPhone(perfil.phone);
        setSalvo(perfil);
      })
      .catch(() => showToast("Não foi possível carregar seus dados.", "error"))
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [showToast]);

  const phoneError = validateStoredPhone(phone);
  const semMudanca = salvo !== null && name.trim() === salvo.name && phone === salvo.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOwnProfile(name, phone);
      setSalvo({ name: name.trim(), phone });
      // O nome mora no JWT: sem `update()` a saudação e o avatar continuariam
      // com o antigo até o próximo login. O `refresh()` recarrega as telas
      // que o renderizam no servidor.
      await update();
      router.refresh();
      showToast("Dados atualizados.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar seus dados.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Meus dados" icon={<IdCard size={14} />}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
          {/* `key` amarrada ao valor salvo: o PhoneField deriva país e máscara
              no mount. Durante a digitação `salvo` não muda, então a key é
              estável e não interrompe ninguém. */}
          <PhoneField
            key={salvo?.phone ?? "sem-telefone"}
            label="Telefone (opcional)"
            value={phone}
            onChange={setPhone}
            hint="Usado para contato do seu líder e para os lembretes de escala."
          />
          <Button
            type="submit"
            disabled={saving || semMudanca || phoneError !== null || !name.trim()}
            className="justify-self-start"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
