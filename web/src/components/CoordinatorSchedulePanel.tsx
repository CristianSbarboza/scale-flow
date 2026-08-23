"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Edit3, Eye, Trash2, Plus, Lock, Link as LinkIcon } from "lucide-react";
import { getCoordinatorSchedules } from "@/lib/actions/coordinator";
import { createSchedule, deleteSchedule } from "@/lib/actions/schedules";
import type { CoordinatorSchedule, CoordinatorSector } from "@/types/domain";
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
          onClose={() => setEditingSchedule(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
