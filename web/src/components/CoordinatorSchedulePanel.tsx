"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Edit3, Eye, Trash2, Plus, Lock, Copy, Link as LinkIcon } from "lucide-react";
import { getCoordinatorSchedules } from "@/lib/actions/coordinator";
import {
  createSchedule,
  deleteSchedule,
  publishSchedule,
  unpublishSchedule,
  duplicateSchedule,
} from "@/lib/actions/schedules";
import type { CoordinatorSchedule, CoordinatorSector, ScheduleDateInput } from "@/types/domain";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleEditor from "@/components/ScheduleEditor";
import AdminCreateModal from "@/components/AdminCreateModal";
import VisibilityToggle, { ScheduleVisibility } from "@/components/VisibilityToggle";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import DataPanel from "@/components/ui/DataPanel";
import Field from "@/components/ui/Field";
import FilterSelect from "@/components/ui/FilterSelect";
import FormPanel from "@/components/ui/FormPanel";
import IconButton from "@/components/ui/IconButton";
import ScheduleDatesField from "@/components/ui/ScheduleDatesField";
import SearchInput from "@/components/ui/SearchInput";
import SelectField from "@/components/ui/SelectField";
import Switch from "@/components/ui/Switch";
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
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailsSchedule, setDetailsSchedule] = useState<CoordinatorSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<CoordinatorSchedule | null>(null);

  const coordinatorMinistries = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of sectors) {
      if (!map.has(s.ministryId)) {
        map.set(s.ministryId, s.ministryName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sectors]);

  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState(sectors.length === 1 ? String(sectors[0].id) : "");
  const [visibility, setVisibility] = useState<ScheduleVisibility>("public");
  const [dates, setDates] = useState<ScheduleDateInput[]>([]);
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSectorId, setFilterSectorId] = useState("all");

  const load = useCallback(async () => {
    const data = await getCoordinatorSchedules();
    setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // O escopo ja vem restrito do servidor: getCoordinatorSchedules so devolve
  // escalas dos setores que esta pessoa coordena. Aqui e so busca e filtro.
  const filteredSchedules = schedules.filter((s) => {
    if (filterSectorId !== "all" && s.sector.name !== filterSectorId) return false;
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return true;
    return (
      s.name.toLowerCase().includes(termo) ||
      s.sector.name.toLowerCase().includes(termo) ||
      s.ministry.name.toLowerCase().includes(termo)
    );
  });

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
      setShowCreateModal(false);
      showToast("Escala criada com sucesso.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao criar escala.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (schedule: CoordinatorSchedule, next: boolean) => {
    if (next) {
      const ok = await askConfirm({
        title: "Publicar escala",
        message:
          `Publicar ${schedule.name}? Todos os servos de ${schedule.sector.name} com telefone ` +
          `cadastrado receberão um aviso no WhatsApp para preencher a disponibilidade.`,
        confirmLabel: "Publicar",
      });
      if (!ok) return;
    }

    setPublishingId(schedule.id);
    try {
      if (next) await publishSchedule(schedule.id);
      else await unpublishSchedule(schedule.id);
      showToast(next ? "Escala publicada." : "Escala voltou para rascunho.", "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao mudar a situação.", "error");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDuplicate = async (schedule: CoordinatorSchedule) => {
    setDuplicatingId(schedule.id);
    try {
      await duplicateSchedule(schedule.id);
      showToast("Escala duplicada como rascunho.", "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao duplicar escala.", "error");
    } finally {
      setDuplicatingId(null);
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
    <>
      <form onSubmit={handleCreate} className="grid gap-6">
        <Field
          label="Nome da Escala"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Escala de Maio"
          required
        />

        {sectors.length > 1 && (
          <SelectField
            label="Setor"
            value={sectorId}
            onChange={setSectorId}
            placeholder="Selecionar"
            options={sectors.map((s) => ({ value: s.id, label: `${s.ministryName} - ${s.name}` }))}
            required
          />
        )}

        <VisibilityToggle value={visibility} onChange={setVisibility} />

        <ScheduleDatesField value={dates} onChange={setDates} />

        <Button type="submit" disabled={creating}>
          <LinkIcon size={18} />
          {creating ? "Gerando..." : "Gerar Link de Escala"}
        </Button>
      </form>

      {lastLink && (
        <Alert tone="success" className="mt-6">
          <p className="mb-2">Escala gerada. Copie o link e envie para o setor.</p>
          <code className="break-all">{lastLink}</code>
        </Alert>
      )}
    </>
  );

  return (
    <div>
      <div className="admin-panel-layout">
        <FormPanel title="Criar Nova Escala">{formContent}</FormPanel>

        <DataPanel
          title="Suas Escalas"
          stackToolbar
          loading={loading}
          toolbar={
            <>
              {sectors.length > 1 && (
                <FilterSelect
                  label="Filtrar por setor"
                  value={filterSectorId}
                  onChange={setFilterSectorId}
                  options={[
                    { value: "all", label: "Todos os Setores" },
                    ...sectors.map((s) => ({ value: s.name, label: s.name })),
                  ]}
                />
              )}
              <SearchInput value={searchTerm} onChange={setSearchTerm} />
              <Button className="lg:hidden" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Nova Escala
              </Button>
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
            { header: "Setor", cell: (s) => s.sector.name },
            {
              header: "Datas",
              cell: (s) => s.dates.length,
            },
            {
              header: "Situação",
              mobileRow: 1,
              cell: (s) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.status === "published"}
                    onChange={(next) => handleTogglePublish(s, next)}
                    label={s.status === "published" ? `Despublicar ${s.name}` : `Publicar ${s.name}`}
                    disabled={publishingId === s.id}
                  />
                  <span className="text-xs text-muted-foreground">
                    {s.status === "published" ? "Publicada" : "Rascunho"}
                  </span>
                </div>
              ),
            },
            {
              header: "Ações",
              cell: (s) => (
                <div className="flex gap-1">
                  <IconButton label="Editar" tone="primary" onClick={() => setEditingSchedule(s)}>
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
                    <LinkIcon size={16} />
                  </IconButton>
                  <IconButton
                    label="Duplicar"
                    tone="muted"
                    onClick={() => handleDuplicate(s)}
                    disabled={duplicatingId === s.id}
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
          ministries={sectors.length > 1 ? coordinatorMinistries : undefined}
          sectors={sectors.length > 1 ? sectors : undefined}
          onClose={() => setEditingSchedule(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
