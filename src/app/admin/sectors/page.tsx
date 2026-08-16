"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createSector, getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { Plus, Search, Filter, LayoutGrid } from "lucide-react";
import AdminCreateModal from "@/components/AdminCreateModal";
import { AdminMobileListItem, AdminMobileField } from "@/components/AdminMobileListItem";
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

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Lista de Setores</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!isLeader && (
                <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 160px', background: 'var(--muted)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>
                  <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <select
                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
                    value={filterMinistryId}
                    onChange={e => setFilterMinistryId(e.target.value)}
                  >
                    <option value="all">Todos Ministérios</option>
                    {ministries.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 160px', background: 'var(--muted)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>
                <Search size={16} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <input
                  placeholder="Pesquisar..."
                  style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', width: '100%', padding: '0.5rem 0' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Setor</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Ministério</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Servos</th>
                </tr>
              </thead>
              <tbody>
                {filteredSectors.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => router.push(`/admin/sectors/${s.id}`)}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div className="flex items-center gap-4 items-center gap-2">
                        <LayoutGrid size={14} className="text-primary/60" />
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem', 
                        background: 'var(--primary)', 
                        color: 'white',
                        borderRadius: '1rem' 
                      }}>
                        {s.ministry.name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>{s.servants?.length || 0}</span>
                    </td>
                  </tr>
                ))}
                {filteredSectors.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      Nenhum setor encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-mobile-list">
            {filteredSectors.map((s) => (
              <AdminMobileListItem key={s.id} onClick={() => router.push(`/admin/sectors/${s.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LayoutGrid size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                </div>
                <AdminMobileField label="Ministério">{s.ministry.name}</AdminMobileField>
                <AdminMobileField label="Servos">{s.servants?.length || 0}</AdminMobileField>
              </AdminMobileListItem>
            ))}
            {filteredSectors.length === 0 && (
              <p style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Nenhum setor encontrado para os filtros selecionados.
              </p>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Novo Setor" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
