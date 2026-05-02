"use client";

import { useState, useEffect } from "react";
import { createSector, getSectors, getMinistries } from "@/lib/actions";
import { Plus, Search, Filter, LayoutGrid } from "lucide-react";
import SectorDetails from "@/components/SectorDetails";
import { AnimatePresence } from "framer-motion";

interface Sector {
  id: number;
  name: string;
  ministry: { id: number; name: string };
  servants: {
    id: number;
    user: { name: string, email: string };
  }[];
}

interface Ministry {
  id: number;
  name: string;
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  
  const [name, setName] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Setores</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Defina os setores dentro de cada ministério.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Novo Setor</h3>
          <form onSubmit={handleCreate} className="grid">
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Nome do Setor</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="grid" style={{ gap: '0.5rem' }}>
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
        </div>

        <div className="card glass">
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ margin: 0 }}>Lista de Setores</h3>
            <div className="flex items-center gap-3">
              <div className="flex" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)' }} />
                <select 
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  value={filterMinistryId}
                  onChange={e => setFilterMinistryId(e.target.value)}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>Todos Ministérios</option>
                  {ministries.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e1b4b' }}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={16} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)' }} />
                <input 
                  placeholder="Pesquisar..." 
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', width: '120px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
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
                    onClick={() => setSelectedSector(s)}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div className="flex items-center gap-2">
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
                      <span className="text-xs font-bold text-white/40">{s.servants?.length || 0}</span>
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
        </div>
      </div>

      <AnimatePresence>
        {selectedSector && (
          <SectorDetails 
            sector={selectedSector} 
            onClose={() => setSelectedSector(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
