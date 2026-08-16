"use client";

import { useState, useEffect } from "react";
import { createSchedule, getSchedules, deleteSchedule } from "@/lib/actions/schedules";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { CalendarPlus, Link as LinkIcon, Trash2, Copy, Edit3, Eye, Plus, Lock } from "lucide-react";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleEditor from "@/components/ScheduleEditor";
import AdminCreateModal from "@/components/AdminCreateModal";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import SelectField from "@/components/ui/SelectField";
import IconButton from "@/components/ui/IconButton";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import VisibilityToggle, { ScheduleVisibility } from "@/components/VisibilityToggle";
import { useAdminTopbar } from "@/components/AdminTopbarContext";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface ScheduleDate {
  id: number;
  date: string;
  startTime: string;
}

interface Schedule {
  id: number;
  name: string;
  status: "draft" | "published";
  visibility: ScheduleVisibility;
  shareLink: string;
  ministryId: number;
  sectorId: number;
  ministry: { name: string };
  sector: { name: string };
  dates: ScheduleDate[];
}

interface Sector {
  id: number;
  name: string;
  ministryId: number;
}

interface Ministry {
  id: number;
  name: string;
}

export default function SchedulesPage() {
  const { showToast } = useToast();
  const askConfirm = useConfirm();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [visibility, setVisibility] = useState<ScheduleVisibility>("public");
  const [dates, setDates] = useState<{ date: string, startTime: string }[]>([]);

  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");

  const [lastLink, setLastLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailsSchedule, setDetailsSchedule] = useState<Schedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");

  const { setAction } = useAdminTopbar();

  const filteredSchedules = schedules.filter((s) => {
    if (filterMinistryId !== "all" && s.ministryId !== parseInt(filterMinistryId)) return false;
    if (filterSectorId !== "all" && s.sectorId !== parseInt(filterSectorId)) return false;
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return true;
    return (
      s.name.toLowerCase().includes(termo) ||
      s.ministry.name.toLowerCase().includes(termo) ||
      s.sector.name.toLowerCase().includes(termo)
    );
  });

  useEffect(() => {
    setAction(
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="btn btn-primary"
      >
        <Plus size={16} /> Cadastrar
      </button>
    );
    return () => setAction(null);
  }, [setAction]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const sch = await getSchedules();
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
          setSchedules(sch as unknown as Schedule[]);
          setSectors(sec as unknown as Sector[]);
          setMinistries(min as unknown as Ministry[]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

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
    if (dates.length === 0) { showToast("Adicione ao menos uma data", "error"); return; }

    setLoading(true);
    const result = await createSchedule(name, parseInt(ministryId), parseInt(sectorId), dates, visibility);
    setLastLink(`${window.location.origin}/escala/${result.shareLink}`);

    setName("");
    setMinistryId("");
    setSectorId("");
    setVisibility("public");
    setDates([]);

    const sch = await getSchedules();
    setSchedules(sch as unknown as Schedule[]);
    setLoading(false);
  };

  const handleEdit = (s: Schedule) => {
    setEditingSchedule(s);
  };

  const handleDelete = async (id: number) => {
    const ok = await askConfirm({
      title: "Excluir escala",
      message: "Tem certeza que deseja excluir esta escala? Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    await deleteSchedule(id);
    const sch = await getSchedules();
    setSchedules(sch as unknown as Schedule[]);
  };

  const formContent = (
    <>
      <form onSubmit={handleCreate} className="grid gap-6">
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>Nome da Escala (ex: Escala de Maio)</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Ministério"
            value={ministryId}
            onChange={setMinistryId}
            placeholder="Selecionar"
            options={ministries.map(m => ({ value: m.id, label: m.name }))}
            required
          />
          <SelectField
            label="Setor"
            value={sectorId}
            onChange={setSectorId}
            placeholder="Selecionar"
            options={sectors
              .filter(sec => sec.ministryId === parseInt(ministryId))
              .map(sec => ({ value: sec.id, label: sec.name }))}
            required
          />
        </div>

        <VisibilityToggle value={visibility} onChange={setVisibility} />

        <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)', marginTop: '0.5rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Adicionar Datas e Horários</h4>
          <div className="grid gap-6" style={{ gap: '0.5rem', gridTemplateColumns: '2fr 1fr auto' }}>
            <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <input type="time" className="input" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
            <button type="button" onClick={addDate} className="btn btn-primary" style={{ padding: '0.5rem' }}>
              <CalendarPlus size={20} />
            </button>
          </div>

          <div style={{ marginTop: '1rem' }}>
            {dates.map((d, i) => (
              <div key={i} className="flex items-center gap-4 justify-between" style={{ padding: '0.5rem', background: 'var(--card)', borderRadius: '0.25rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span>{d.date} | {d.startTime}</span>
                <button type="button" onClick={() => removeDate(i)} style={{ color: '#ef4444' }}>Remover</button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          <LinkIcon size={18} />
          {loading ? "Gerando..." : "Gerar Link de Escala"}
        </button>
      </form>

      {lastLink && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius)' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Escala gerada com sucesso. Copie o link e envie para o voluntário, ou avise a ele que já está disponível no perfil dele.
          </p>
          <div className="flex items-center gap-4" style={{ wordBreak: 'break-all' }}>
            <code style={{ fontSize: '0.875rem', color: '#10b981' }}>{lastLink}</code>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Escalas</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Crie escalas e envie o link para os servos selecionarem suas datas.</p>
      </header>

      <div className="admin-panel-layout">
        {/* Create Form */}
        <FormPanel title="Criar Nova Escala">{formContent}</FormPanel>

        {/* List */}
        <DataPanel
          className="self-start"
          title="Escalas Recentes"
          stackToolbar
          toolbar={
            <>
              {ministries.length > 1 && (
                <FilterSelect
                  label="Filtrar por ministério"
                  value={filterMinistryId}
                  onChange={(v) => {
                    setFilterMinistryId(v);
                    setFilterSectorId("all"); // troca de ministério zera o setor
                  }}
                  options={[
                    { value: "all", label: "Todos Ministérios" },
                    ...ministries.map((m) => ({ value: String(m.id), label: m.name })),
                  ]}
                />
              )}
              <FilterSelect
                label="Filtrar por setor"
                value={filterSectorId}
                onChange={setFilterSectorId}
                options={[
                  { value: "all", label: "Todos Setores" },
                  ...sectors
                    .filter((sec) => filterMinistryId === "all" || sec.ministryId === parseInt(filterMinistryId))
                    .map((sec) => ({ value: String(sec.id), label: sec.name })),
                ]}
              />
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar escala, ministério ou setor..."
              />
            </>
          }
          rows={filteredSchedules}
          rowKey={(s) => s.id}
          empty={
            schedules.length === 0
              ? "Nenhuma escala criada ainda."
              : "Nenhuma escala encontrada para os filtros selecionados."
          }
          columns={[
            {
              header: "Nome",
              primary: true,
              cell: (s) => (
                <span className="flex items-center gap-1.5">
                  {s.name}
                  {s.visibility === "private" && (
                    <Lock size={13} className="text-muted-foreground" aria-label="Escala privada" />
                  )}
                </span>
              ),
            },
            {
              header: "Ministério",
              cell: (s) => s.ministry.name,
            },
            {
              header: "Setor",
              cell: (s) => s.sector.name,
            },
            {
              header: "Ações",
              cell: (s) => (
                <div className="flex gap-1">
                  <IconButton label="Editar" tone="primary" onClick={() => handleEdit(s)}>
                    <Edit3 size={16} />
                  </IconButton>
                  <IconButton
                    label="Copiar link"
                    tone="muted"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/escala/${s.shareLink}`);
                      showToast("Link copiado!", "success");
                    }}
                  >
                    <Copy size={16} />
                  </IconButton>
                  <IconButton label="Excluir" tone="destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                  <IconButton label="Ver detalhes" onClick={() => setDetailsSchedule(s)}>
                    <Eye size={16} />
                  </IconButton>
                </div>
              ),
            },
          ]}
        />
      </div>

      {detailsSchedule && (
        <ScheduleManager
          schedule={detailsSchedule}
          onClose={() => {
            setDetailsSchedule(null);
            getSchedules().then(sch => setSchedules(sch as unknown as Schedule[]));
          }}
        />
      )}

      {editingSchedule && (
        <ScheduleEditor 
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={() => getSchedules().then(sch => setSchedules(sch as unknown as Schedule[]))}
        />
      )}

      {showCreateModal && (
        <AdminCreateModal title="Criar Nova Escala" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
