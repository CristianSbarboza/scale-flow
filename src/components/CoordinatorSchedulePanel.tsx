"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarPlus, Copy, Edit3, Eye, Trash2, Plus, Lock } from "lucide-react";
import { getCoordinatorSchedules } from "@/lib/actions";
import { createSchedule, deleteSchedule } from "@/lib/actions/schedules";
import type { CoordinatorSchedule, CoordinatorSector } from "@/types/domain";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleEditor from "@/components/ScheduleEditor";
import AdminCreateModal from "@/components/AdminCreateModal";
import VisibilityToggle, { ScheduleVisibility } from "@/components/VisibilityToggle";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface Props {
  sectors: CoordinatorSector[];
}

export default function CoordinatorSchedulePanel({ sectors }: Props) {
  const { showToast } = useToast();
  const askConfirm = useConfirm();

  const [schedules, setSchedules] = useState<CoordinatorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailsSchedule, setDetailsSchedule] = useState<CoordinatorSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<CoordinatorSchedule | null>(null);

  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState(sectors.length === 1 ? String(sectors[0].id) : "");
  const [visibility, setVisibility] = useState<ScheduleVisibility>("public");
  const [dates, setDates] = useState<{ date: string; startTime: string }[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const load = useCallback(async () => {
    const data = await getCoordinatorSchedules();
    setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const addDate = () => {
    if (!newDate) return;
    setDates([...dates, { date: newDate, startTime: newStartTime }]);
    setNewDate("");
  };

  const removeDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorId) { showToast("Selecione um setor.", "error"); return; }
    if (dates.length === 0) { showToast("Adicione ao menos uma data.", "error"); return; }

    const sector = sectors.find((s) => s.id === parseInt(sectorId));
    if (!sector) return;

    setCreating(true);
    try {
      const result = await createSchedule(name, sector.ministryId, sector.id, dates, visibility);
      setLastLink(`${window.location.origin}/escala/${result.shareLink}`);
      setName("");
      setVisibility("public");
      setDates([]);
      showToast("Escala criada com sucesso.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao criar escala.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await askConfirm({
      title: "Excluir escala",
      message: "Tem certeza que deseja excluir esta escala? Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    try {
      await deleteSchedule(id);
      showToast("Escala excluída.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast("Erro ao excluir escala.", "error");
    }
  };

  const formContent = (
    <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Nome da Escala</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Escala de Maio" required />
      </div>

      {sectors.length > 1 && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Setor</label>
          <select className="input" value={sectorId} onChange={(e) => setSectorId(e.target.value)} required>
            <option value="">Selecionar</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.ministryName} - {s.name}</option>
            ))}
          </select>
        </div>
      )}

      <VisibilityToggle value={visibility} onChange={setVisibility} />

      <div style={{ padding: "1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
        <p style={{ marginBottom: "0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>Adicionar Datas e Horários</p>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "2fr 1fr auto" }}>
          <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <input type="time" className="input" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
          <button type="button" onClick={addDate} className="btn btn-primary" style={{ padding: "0.5rem" }}>
            <CalendarPlus size={20} />
          </button>
        </div>
        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
          {dates.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", background: "var(--card)", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
              <span>{d.date} | {d.startTime.slice(0, 5)}</span>
              <button type="button" onClick={() => removeDate(i)} style={{ color: "#ef4444" }}>Remover</button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={creating}>
        {creating ? "Gerando..." : "Gerar Link de Escala"}
      </button>

      {lastLink && (
        <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: "var(--radius)" }}>
          <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>Escala gerada. Copie o link e envie para o setor.</p>
          <code style={{ fontSize: "0.8125rem", color: "#10b981", wordBreak: "break-all" }}>{lastLink}</code>
        </div>
      )}
    </form>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", gap: "1rem" }}>
        <div className="animate-spin" style={{ width: "36px", height: "36px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
          Escalas dos setores que você coordena.
        </p>
        <button type="button" onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ flexShrink: 0 }}>
          <Plus size={16} /> Nova Escala
        </button>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {schedules.map((s) => (
          <div key={s.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
            <p style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.375rem" }}>
              {s.name}
              {s.visibility === "private" && (
                <Lock size={13} color="var(--muted-foreground)" aria-label="Escala privada" />
              )}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
              {s.ministry.name} · {s.sector.name} · {s.dates.length} {s.dates.length === 1 ? "data" : "datas"}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", paddingTop: "0.25rem", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setEditingSchedule(s)} title="Editar" style={{ color: "var(--primary)", padding: "0.375rem" }}>
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/escala/${s.shareLink}`);
                  showToast("Link copiado!", "success");
                }}
                title="Copiar link"
                style={{ color: "var(--muted-foreground)", padding: "0.375rem" }}
              >
                <Copy size={16} />
              </button>
              <button onClick={() => handleDelete(s.id)} title="Excluir" style={{ color: "#ef4444", padding: "0.375rem" }}>
                <Trash2 size={16} />
              </button>
              <button onClick={() => setDetailsSchedule(s)} title="Ver detalhes" style={{ color: "var(--foreground)", padding: "0.375rem" }}>
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
            Nenhuma escala criada ainda.
          </p>
        )}
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Nova Escala" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}

      {detailsSchedule && (
        <ScheduleManager
          schedule={detailsSchedule}
          onClose={() => {
            setDetailsSchedule(null);
            load();
          }}
        />
      )}

      {editingSchedule && (
        <ScheduleEditor
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
