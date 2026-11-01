"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createSector, getSectors, setSectorActive } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { Plus, LayoutGrid } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import SelectField from "@/components/ui/SelectField";
import FilterSelect from "@/components/ui/FilterSelect";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import Switch from "@/components/ui/Switch";
import { useAdminTopbar } from "@/components/AdminTopbarContext";
import { useToast } from "@/components/Toast";

interface Sector {
  id: number;
  name: string;
  isActive: boolean;
  ministry: { id: number; name: string; isActive?: boolean };
  servants: {
    id: number;
    user: { name: string, username: string | null, email: string | null };
  }[];
}

interface Ministry {
  id: number;
  name: string;
  isActive?: boolean;
}

export default function SectorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const isLeader = session?.user.role === "leader";
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  const [name, setName] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setAction } = useAdminTopbar();

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
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
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
    setLoading(true);
    try {
      await createSector(name, parseInt(ministryId));
      setName("");
      setMinistryId("");

      // Refresh list
      const sec = await getSectors();
      setSectors(sec as unknown as Sector[]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao criar setor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (sector: Sector, next: boolean) => {
    setTogglingId(sector.id);
    try {
      await setSectorActive(sector.id, next);
      showToast(next ? "Setor ativado." : "Setor desativado.", "success");
      const sec = await getSectors();
      setSectors(sec as unknown as Sector[]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao alterar situação.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSectors = sectors.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMinistry = filterMinistryId === "all" || s.ministry.id === parseInt(filterMinistryId);
    return matchesSearch && matchesMinistry;
  });

  const formContent = (
    <form onSubmit={handleCreate} className="grid gap-6">
      <Field
        label="Nome do Setor"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <SelectField
        label="Ministério"
        value={ministryId}
        onChange={setMinistryId}
        placeholder="Selecione um ministério"
        options={ministries
          .filter((m) => m.isActive !== false)
          .map((m) => ({ value: m.id, label: m.name }))}
        required
      />
      <Button type="submit" disabled={loading}>
        <Plus size={18} />
        {loading ? "Salvando..." : "Adicionar"}
      </Button>
    </form>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Setores" subtitle="Defina os setores dentro de cada ministério." />

      <div className="admin-panel-layout">
        <FormPanel title="Novo Setor">{formContent}</FormPanel>

        <DataPanel
          title="Lista de Setores"
          toolbar={
            <>
              {!isLeader && (
                <FilterSelect
                  label="Filtrar por ministério"
                  value={filterMinistryId}
                  onChange={setFilterMinistryId}
                  options={[
                    { value: "all", label: "Todos Ministérios" },
                    ...ministries.map((m) => ({ value: String(m.id), label: m.name })),
                  ]}
                />
              )}
              <SearchInput value={searchTerm} onChange={setSearchTerm} />
            </>
          }
          rows={filteredSectors}
          loading={loadingList}
          rowKey={(s) => s.id}
          onRowClick={(s) => router.push(`/admin/sectors/${s.id}`)}
          empty="Nenhum setor encontrado para os filtros selecionados."
          columns={[
            {
              header: "Setor",
              primary: true,
              cell: (s) => (
                <div className="flex items-center gap-2">
                  <LayoutGrid size={14} className="text-primary" />
                  <span>{s.name}</span>
                </div>
              ),
            },
            {
              header: "Ministério",
              cell: (s) => s.ministry.name,
            },
            {
              header: "Servos",
              cell: (s) => s.servants?.length || 0,
            },
            {
              header: "Situação",
              mobileRow: 1,
              cell: (s) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.isActive}
                    onChange={(next) => handleToggleActive(s, next)}
                    label={s.isActive ? `Desativar ${s.name}` : `Ativar ${s.name}`}
                    disabled={togglingId === s.id}
                  />
                  <span className="text-xs text-muted-foreground">
                    {s.isActive ? "Ativo" : "Desativado"}
                  </span>
                </div>
              ),
            },
          ]}
        />
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Novo Setor" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
