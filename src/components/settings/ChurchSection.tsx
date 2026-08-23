"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import SettingsSection from "@/components/ui/SettingsSection";
import { useChurch } from "@/components/ChurchContext";
import { renameChurch } from "@/lib/actions/church";
import { useToast } from "@/components/Toast";

/**
 * Nome da igreja, editável. Só admin — a tela de configurações decide quem
 * monta esta seção; ela não se esconde sozinha.
 *
 * O username fica visível mas não editável: é o que os servos digitam no
 * login, e o admin precisa poder lê-lo para passar adiante. Deixá-lo escondido
 * obrigaria a pedir para o suporte; deixá-lo editável quebraria o login de
 * todo mundo num clique.
 */
export default function ChurchSection() {
  const church = useChurch();
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(church.name);
  const [loading, setLoading] = useState(false);

  const trimmed = name.trim();
  const unchanged = trimmed === church.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      showToast("O nome da igreja não pode ficar vazio.", "error");
      return;
    }
    setLoading(true);
    try {
      await renameChurch(trimmed);
      showToast("Nome da igreja atualizado.", "success");
      // O nome vem do layout (servidor); sem isto a barra lateral continua
      // mostrando o antigo até a próxima navegação completa.
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar o nome.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection title="Igreja" icon={<Landmark size={14} />}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field
          label="Nome da igreja"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
        />

        <div>
          <p className="text-[0.8125rem] text-muted-foreground">
            Identificador no login:{" "}
            <strong className="break-all text-foreground">{church.username}</strong>
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            É o que os servos digitam no campo <em>Igreja</em> para entrar. Não muda ao renomear.
          </p>
        </div>

        <Button type="submit" disabled={loading || unchanged} className="justify-self-start">
          <Save size={16} />
          {loading ? "Salvando..." : "Salvar Nome"}
        </Button>
      </form>
    </SettingsSection>
  );
}
