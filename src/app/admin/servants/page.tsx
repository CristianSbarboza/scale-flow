"use client";

import { useState, useEffect } from "react";
import { createServant, getServants, getSectors, getMinistries } from "@/lib/actions";
import { UserPlus, Copy, Check, ShieldAlert, Search, Filter } from "lucide-react";

interface Servant {
  id: number;
  user: { name: string; email: string };
  sector: { id: number; name: string; ministry: { id: number; name: string } };
}

interface Sector {
  id: number;
  name: string;
  ministryId: number;
  ministry: { id: number; name: string };
}

interface Ministry {
  id: number;
  name: string;
}

export default function ServantsPage() {
  const [servants, setServants] = useState<Servant[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sectorId, setSectorId] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const srv = await getServants();
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
          setServants(srv as unknown as Servant[]);
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
    const result = await createServant(name, email, parseInt(sectorId));
    setGeneratedPassword(result.password);
    setName("");
    setEmail("");
    setSectorId("");
    
    // Refresh list
    const srv = await getServants();
    setServants(srv as unknown as Servant[]);
    
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredServants = servants.filter(s => {
    const matchesSearch = s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMinistry = filterMinistryId === "all" || s.sector.ministry.id === parseInt(filterMinistryId);
    const matchesSector = filterSectorId === "all" || s.sector.id === parseInt(filterSectorId);
    return matchesSearch && matchesMinistry && matchesSector;
  });

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Gestão de Servos</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Cadastre e gerencie os voluntários da sua igreja.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2.5fr' }}>
        {/* Form */}
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Servo</h3>
          <form onSubmit={handleCreate} className="grid">
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Nome Completo</label>
              <input 
                className="input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>E-mail</label>
              <input 
                className="input" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Setor Principal</label>
              <select 
                className="input" 
                value={sectorId} 
                onChange={e => setSectorId(e.target.value)} 
                required
              >
                <option value="">Selecione um setor</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.ministry.name} - {s.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <UserPlus size={18} />
              {loading ? "Cadastrando..." : "Cadastrar Servo"}
            </button>
          </form>

          {generatedPassword && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div className="flex" style={{ color: 'var(--accent)' }}>
                <ShieldAlert size={18} />
                <span style={{ fontWeight: 600 }}>Senha de Primeiro Acesso</span>
              </div>
              <p style={{ fontSize: '0.875rem' }}>Passe esta senha ao servo. Ele poderá alterá-la após o login.</p>
              <div className="flex justify-between" style={{ 
                background: 'var(--input)', 
                padding: '0.5rem 1rem', 
                borderRadius: '0.5rem',
                border: '1px solid var(--border)'
              }}>
                <code style={{ fontSize: '1.125rem', color: 'var(--accent)' }}>{generatedPassword}</code>
                <button onClick={copyToClipboard} style={{ color: copied ? '#10b981' : 'inherit' }}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="card glass">
          <div className="flex flex-col gap-4 mb-6">
            <h3 style={{ margin: 0 }}>Servos Cadastrados</h3>
            
            <div className="flex flex-wrap gap-3">
              {/* Ministry Filter */}
              <div className="flex flex-1" style={{ minWidth: '180px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                <select 
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
                  value={filterMinistryId}
                  onChange={e => {
                    setFilterMinistryId(e.target.value);
                    setFilterSectorId("all"); // Reset sector when ministry changes
                  }}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>Todos Ministérios</option>
                  {ministries.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e1b4b' }}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div className="flex flex-1" style={{ minWidth: '180px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                <select 
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
                  value={filterSectorId}
                  onChange={e => setFilterSectorId(e.target.value)}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>Todos Setores</option>
                  {sectors
                    .filter(s => filterMinistryId === "all" || s.ministryId === parseInt(filterMinistryId))
                    .map(s => (
                      <option key={s.id} value={s.id} style={{ background: '#1e1b4b' }}>{s.name}</option>
                    ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex flex-1" style={{ minWidth: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={16} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                <input 
                  placeholder="Pesquisar nome ou e-mail..." 
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
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
                  <th style={{ padding: '1rem 0.5rem' }}>Nome</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Setor</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Ministério</th>
                  <th style={{ padding: '1rem 0.5rem' }}>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {filteredServants.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{s.user.name}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem', 
                        background: 'var(--muted)', 
                        borderRadius: '1rem' 
                      }}>
                        {s.sector.name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.sector.ministry.name}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--muted-foreground)' }}>{s.user.email}</td>
                  </tr>
                ))}
                {filteredServants.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                      Nenhum servo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
