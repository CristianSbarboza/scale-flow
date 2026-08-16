"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createSector, getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { Plus, LayoutGrid } from "lucide-react";
import Badge from "@/components/ui/Badge";
import DataPanel from "@/components/ui/DataPanel";
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
      <div className="grid gap-6" style={{ gap: '0.5rem' }}>
        <label>Nome do Setor</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="grid gap-6" style={{ gap: '0.5rem' }}>
        <label>Ministério</label>
        <select className="input" value={ministryId} onChange={e => setMinistryId(e.target.value)} required>
          <option value="">Selecione um ministério</option>
          {ministries.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        <Plus size={18} />
        {loading ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Setores</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Defina os setores dentro de cada ministério.</p>
      </header>

      <div className="admin-panel-layout" style={{ '--panel-ratio': '1fr 2fr' } as React.CSSProperties}>
        <div className="card glass admin-form-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Novo Setor</h3>
          {formContent}
        </div>

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
                  <LayoutGrid size={14} className="text-primary/60" />
                  <span>{s.name}</span>
                </div>
              ),
            },
            {
              header: "Ministério",
              cell: (s) => <Badge tone="primary" solid>{s.ministry.name}</Badge>,
            },
            {
              header: "Servos",
              cell: (s) => (
                <span className="text-xs font-bold text-muted-foreground">
                  {s.servants?.length || 0}
                </span>
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
