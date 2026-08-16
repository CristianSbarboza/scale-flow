"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, KeyRound, Trash2, User, Star } from "lucide-react";
import { getServantMember, addServantToSector, removeServantFromSector, setServantCoordinator, resetServantPassword, deleteServantAccount } from "@/lib/actions/servants";
import { getSectors } from "@/lib/actions/sectors";
import type { ServantSummary } from "@/types/domain";
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

  const load = useCallback(async () => {
    const [m, sec] = await Promise.all([getServantMember(userId), getSectors()]);
    if (!m) {
      router.replace("/admin/servants");
      return;
    }
    setMember(m);
    setSectors(sec as unknown as SectorOption[]);
    setLoading(false);
  }, [userId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading || !member) return null;

  const availableSectors = sectors.filter((s) => !member.memberships.some((m) => m.sectorId === s.id));

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
    try {
      await setServantCoordinator(servantId, next);
      showToast(next ? "Definido como coordenador do setor." : "Removido como coordenador do setor.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast("Erro ao atualizar coordenador.", "error");
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
        </div>
      </header>

      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "1 1 160px", borderLeft: "3px solid var(--primary)" }}>
          <p style={{ ...sectionLabelStyle, marginBottom: "0.25rem" }}>Setores Vinculados</p>
          <p style={{ fontSize: "2rem", fontWeight: 700 }}>{member.memberships.length}</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "2.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <LayoutGrid size={16} color="var(--primary)" />
            <span style={sectionLabelStyle}>Setores</span>
          </div>

          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {member.memberships.map((m) => (
              <div
                key={m.servantId}
                className="card"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <p style={{ fontWeight: 600 }}>{m.sectorName}</p>
                    {m.isCoordinator && (
                      <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: "1rem", background: "rgba(249, 115, 22, 0.15)", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Coordenador
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{m.ministryName}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.125rem" }}>
                  <button
                    onClick={() => handleToggleCoordinator(m.servantId, !m.isCoordinator)}
                    title={m.isCoordinator ? "Remover como coordenador do setor" : "Tornar coordenador do setor"}
                    style={{ color: m.isCoordinator ? "var(--primary)" : "var(--muted-foreground)", padding: "0.5rem" }}
                  >
                    <Star size={16} fill={m.isCoordinator ? "var(--primary)" : "none"} />
                  </button>
                  <button
                    onClick={() => handleRemoveSector(m.servantId, m.sectorName)}
                    style={{ color: "#ef4444", padding: "0.5rem" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {member.memberships.length === 0 && (
              <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", fontStyle: "italic" }}>
                Sem setores vinculados.
              </p>
            )}
          </div>

          {availableSectors.length > 0 && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <select
                className="input"
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
              >
                <option value="">Selecione um setor</option>
                {availableSectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.ministry.name} - {s.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddSector}
                className="btn btn-primary"
                disabled={!selectedSectorId || addingLoading}
              >
                Adicionar
              </button>
            </div>
          )}
        </div>

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
