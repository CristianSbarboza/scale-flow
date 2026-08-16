"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createSector, getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { Plus, LayoutGrid } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import FormPanel from "@/components/ui/FormPanel";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import SelectField from "@/components/ui/SelectField";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

interface Sector {
  id: number;
  name: string;
  ministry: { id: number; name: string };
  servants: {
    id: number;
    user: { name: string, username: string | null, email: string | null };
  }[];
}

interface Ministry {
  id: number;
  name: string;
}

export default function SectorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isLeader = session?.user.role === "leader";
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  const [name, setName] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setAction } = useAdminTopbar();

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
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createSector(name, parseInt(ministryId));
    setName("");
    setMinistryId("");
    
    // Refresh list
    const sec = await getSectors();
    setSectors(sec as unknown as Sector[]);
    
    setLoading(false);
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
        options={ministries.map(m => ({ value: m.id, label: m.name }))}
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
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Setores</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Defina os setores dentro de cada ministério.</p>
      </header>

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
