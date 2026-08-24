"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, KeyRound, Trash2, User, Phone, Save } from "lucide-react";
import { formatPhone, validateStoredPhone } from "@/lib/phone";
import { getServantMember, addServantToSector, removeServantFromSector, setServantCoordinator, resetServantPassword, deleteServantAccount, updateServantProfile } from "@/lib/actions/servants";
import { getSectors } from "@/lib/actions/sectors";
import Select from "@/components/ui/Select";
import StatsRule from "@/components/ui/StatsRule";
import Field from "@/components/ui/Field";
import PhoneField from "@/components/ui/PhoneField";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import DataPanel from "@/components/ui/DataPanel";
import Switch from "@/components/ui/Switch";
import type { ServantMembership, ServantSummary } from "@/types/domain";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface SectorOption {
  id: number;
  name: string;
  ministry: { id: number; name: string };
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  marginBottom: "1.5rem",
};

export default function ServantMemberPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { showToast } = useToast();
  const askConfirm = useConfirm();

  const [member, setMember] = useState<ServantSummary | null>(null);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmingPassword, setConfirmingPassword] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Qual interruptor está salvando. Sem isso ele volta sozinho enquanto o
  // servidor responde, e parece que o clique não pegou.
  const [coordinatorLoading, setCoordinatorLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [m, sec] = await Promise.all([getServantMember(userId), getSectors()]);
    if (!m) {
      router.replace("/admin/servants");
      return;
    }
    setMember(m);
    setEditName(m.name);
    setEditPhone(m.phone);
    setSectors(sec as unknown as SectorOption[]);
    setLoading(false);
  }, [userId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading || !member) return null;

  const availableSectors = sectors.filter((s) => !member.memberships.some((m) => m.sectorId === s.id));
  // Bloqueia o envio com telefone inválido. Sem isto a pessoa corrige o nome,
  // o telefone está errado, e a recusa da action leva as duas coisas junto.
  const phoneError = validateStoredPhone(editPhone);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateServantProfile(userId, editName, editPhone);
      showToast("Dados atualizados.", "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar os dados.", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddSector = async () => {
    if (!selectedSectorId) return;
    setAddingLoading(true);
    try {
      await addServantToSector(member.userId, parseInt(selectedSectorId));
      setSelectedSectorId("");
      showToast("Setor adicionado.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast("Erro ao adicionar setor.", "error");
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRemoveSector = async (servantId: number, sectorName: string) => {
    const ok = await askConfirm({
      title: "Remover de setor",
      message: `Remover ${member.name} do setor ${sectorName}? A disponibilidade e confirmações dele nesse setor também serão apagadas.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;

    try {
      await removeServantFromSector(servantId);
      showToast("Removido do setor.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast("Erro ao remover do setor.", "error");
    }
  };

  const handleToggleCoordinator = async (servantId: number, next: boolean) => {
    setCoordinatorLoading(servantId);
    try {
      await setServantCoordinator(servantId, next);
      showToast(next ? "Definido como coordenador do setor." : "Removido como coordenador do setor.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast("Erro ao atualizar coordenador.", "error");
    } finally {
      setCoordinatorLoading(null);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmingPassword) return;
    setPasswordLoading(true);
    try {
      await resetServantPassword(member.userId, newPassword, confirmingPassword);
      setNewPassword("");
      setConfirmingPassword("");
      showToast("Senha alterada.", "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao alterar senha.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: "Excluir membro",
      message: `Excluir ${member.name} definitivamente? A conta, todos os vínculos e o histórico de disponibilidade/confirmação serão apagados. Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    try {
      await deleteServantAccount(member.userId);
      showToast("Membro excluído.", "success");
      router.push("/admin/servants");
    } catch (error) {
      console.error(error);
      showToast("Erro ao excluir membro.", "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <Link href="/admin/servants" style={backLinkStyle}>
        <ArrowLeft size={16} /> Voltar para Servos
      </Link>

      <header style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
          <User size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: "2rem" }}>{member.name}</h1>
          <p style={{ color: "var(--muted-foreground)" }}>
            {member.username ? `usuário: ${member.username}` : (member.email || "-")}
          </p>
          {/* Só aparece quando existe. Rótulo sem valor ao lado é pior que a
              ausência: ocupa espaço para dizer que não há informação. */}
          {member.phone && (
            <a
              href={`tel:+${member.phone}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Phone size={14} />
              {formatPhone(member.phone)}
            </a>
          )}
        </div>
      </header>

      {/* Mesma régua da Visão Geral, em vez de um card de 120px de altura para
          exibir um número. O contador é referência, não o assunto da tela. */}
      <StatsRule
        className="mb-8"
        items={[{ icon: LayoutGrid, label: "Setores Vinculados", value: member.memberships.length }]}
      />

      {/* Coluna única de 640px, a mesma medida de /admin/settings. Sem limite,
          a lista de setores esticava pela tela inteira para mostrar um nome e
          dois botões, e as ações ficavam longe do texto a que pertencem. */}
      <div className="grid max-w-[640px] gap-10">
        <form onSubmit={handleSaveProfile} className="card">
          <p style={{ ...sectionLabelStyle, marginBottom: "1rem" }}>Dados do Membro</p>
          <div className="grid gap-4">
            <Field
              label="Nome"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={120}
              required
            />
            {/* `key` amarrada ao valor salvo: o PhoneField deriva país e
                máscara no mount, então sem remontar ele mostraria o número
                antigo depois de salvar. Durante a digitação `member.phone`
                não muda, então a key é estável e não interrompe ninguém. */}
            <PhoneField
              key={member.phone ?? "sem-telefone"}
              label="Telefone (opcional)"
              value={editPhone}
              onChange={setEditPhone}
            />
            <Button
              type="submit"
              disabled={
                profileLoading
                || phoneError !== null
                || (editName.trim() === member.name && editPhone === member.phone)
              }
              className="justify-self-start"
            >
              <Save size={16} />
              {profileLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {member.username
              ? `O usuário de login (${member.username}) não muda por aqui.`
              : "O e-mail de login não muda por aqui."}
          </p>
        </form>

        {/* DataPanel em vez de lista à mão: ele dá os cabeçalhos de coluna no
            desktop e vira cards rotulados no celular, a partir da mesma
            declaração. Escrever as duas formas separadas foi o que ele nasceu
            para evitar. */}
        <DataPanel<ServantMembership>
          title="Setores"
          columns={[
            {
              header: "Nome",
              primary: true,
              cell: (m) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.sectorName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.ministryName}</p>
                </div>
              ),
            },
            {
              header: "Coordenador",
              align: "right",
              mobileRow: 1,
              cell: (m) => (
                <Switch
                  checked={m.isCoordinator}
                  onChange={(next) => handleToggleCoordinator(m.servantId, next)}
                  label={`Coordenador do setor ${m.sectorName}`}
                  disabled={coordinatorLoading === m.servantId}
                />
              ),
            },
            {
              header: "Excluir",
              align: "right",
              mobileRow: 1,
              cell: (m) => (
                <IconButton
                  label={`Remover do setor ${m.sectorName}`}
                  tone="destructive"
                  onClick={() => handleRemoveSector(m.servantId, m.sectorName)}
                >
                  <Trash2 size={16} />
                </IconButton>
              ),
            },
          ]}
          rows={member.memberships}
          rowKey={(m) => m.servantId}
          empty="Sem setores vinculados."
          footer={
            availableSectors.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  label="Setor a adicionar"
                  value={selectedSectorId}
                  onChange={setSelectedSectorId}
                  options={[
                    { value: "", label: "Selecione um setor" },
                    ...availableSectors.map((sec) => ({
                      value: String(sec.id),
                      label: `${sec.ministry.name} - ${sec.name}`,
                    })),
                  ]}
                />
                <Button onClick={handleAddSector} disabled={!selectedSectorId || addingLoading}>
                  {addingLoading ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Já vinculado a todos os setores disponíveis.
              </p>
            )
          }
        />

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <KeyRound size={16} color="#ef4444" />
            <span style={{ ...sectionLabelStyle, color: "#ef4444" }}>Zona de Risco</span>
          </div>
          <div className="card" style={{ border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 320px", display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Nova senha para {member.name}</label>
              <input
                className="input"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, marginTop: "0.25rem" }}>Sua senha atual (para confirmar)</label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  className="input"
                  type="password"
                  value={confirmingPassword}
                  onChange={(e) => setConfirmingPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                />
                <button
                  onClick={handleChangePassword}
                  className="btn btn-secondary"
                  disabled={!newPassword || !confirmingPassword || passwordLoading}
                  style={{ flexShrink: 0 }}
                >
                  {passwordLoading ? "Alterando..." : "Alterar Senha"}
                </button>
              </div>
            </div>

            <button onClick={handleDelete} className="btn" style={{ background: "#ef4444", color: "white", flexShrink: 0 }}>
              <Trash2 size={18} />
              Excluir Membro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
