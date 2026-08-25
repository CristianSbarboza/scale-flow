"use client";

import { useState, useEffect } from "react";
import { createSchedule, getSchedules, deleteSchedule, publishSchedule, unpublishSchedule, duplicateSchedule } from "@/lib/actions/schedules";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { Link as LinkIcon, Trash2, Copy, Edit3, Eye, Plus, Lock } from "lucide-react";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleEditor from "@/components/ScheduleEditor";
import AdminCreateModal from "@/components/AdminCreateModal";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import SelectField from "@/components/ui/SelectField";
import Field from "@/components/ui/Field";
import ScheduleDatesField from "@/components/ui/ScheduleDatesField";
import IconButton from "@/components/ui/IconButton";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import VisibilityToggle, { ScheduleVisibility } from "@/components/VisibilityToggle";
import PageHeader from "@/components/ui/PageHeader";
import { useAdminTopbar } from "@/components/AdminTopbarContext";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";

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


  const [lastLink, setLastLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
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
      <Button variant="primary" type="button"
        onClick={() => setShowCreateModal(true)}>
        <Plus size={16} /> Cadastrar
      </Button>
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
      } finally {
        setLoadingList(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);



  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dates.length === 0) { showToast("Adicione ao menos uma data", "error"); return; }

    setLoading(true);
    try {
      const result = await createSchedule(name, parseInt(ministryId), parseInt(sectorId), dates, visibility);
      setLastLink(`${window.location.origin}/escala/${result.shareLink}`);

      setName("");
      setMinistryId("");
      setSectorId("");
      setVisibility("public");
      setDates([]);

      const sch = await getSchedules();
      setSchedules(sch as unknown as Schedule[]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao criar escala.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (schedule: Schedule, next: boolean) => {
    // Publicar avisa todo o setor por WhatsApp — não é o tipo de coisa que se
    // desfaz com um clique de arrependimento, então confirma antes.
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
      const atualizadas = await getSchedules();
      setSchedules(atualizadas as unknown as Schedule[]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao mudar a situação.", "error");
    } finally {
      setPublishingId(null);
    }
  };

  // Sem confirmação, ao contrário de publicar e excluir: duplicar não avisa
  // ninguém e não apaga nada — o desfazer é excluir a cópia.
  const handleDuplicate = async (s: Schedule) => {
    setDuplicatingId(s.id);
    try {
      await duplicateSchedule(s.id);
      showToast("Escala duplicada como rascunho.", "success");
      const sch = await getSchedules();
      setSchedules(sch as unknown as Schedule[]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao duplicar escala.", "error");
    } finally {
      setDuplicatingId(null);
    }
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
        <Field
          label="Nome da Escala"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Escala de Maio"
          required
        />

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

        <ScheduleDatesField value={dates} onChange={setDates} />

        <Button variant="primary" type="submit"  disabled={loading}>
          <LinkIcon size={18} />
          {loading ? "Gerando..." : "Gerar Link de Escala"}
        </Button>
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
      <PageHeader title="Escalas" subtitle="Crie escalas e envie o link para os servos selecionarem suas datas." />

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
          loading={loadingList}
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
              header: "Situação",
              mobileRow: 1,
              cell: (s) => (
                // Interruptor, não botão: publicar e despublicar são o mesmo
                // eixo, e o estado precisa ser visível na lista — era o rótulo
                // "draft" que ninguém sabia como mudar.
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
          ministries={ministries}
          sectors={sectors}
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
