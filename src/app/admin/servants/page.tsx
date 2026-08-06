"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createServant, getServants, getSectors, getMinistries } from "@/lib/actions";
import { UserPlus, Copy, Check, ShieldAlert, Search, Filter, Plus } from "lucide-react";
import AdminCreateModal from "@/components/AdminCreateModal";
import { AdminMobileListItem, AdminMobileField } from "@/components/AdminMobileListItem";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

interface Membership {
  servantId: number;
  sectorId: number;
  sectorName: string;
  ministryId: number;
  ministryName: string;
}

interface ServantSummary {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  memberships: Membership[];
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
  const { data: session } = useSession();
  const router = useRouter();
  const isLeader = session?.user.role === "leader";
  const [servants, setServants] = useState<ServantSummary[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [sectorId, setSectorId] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
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
        const srv = await getServants();
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
          setServants(srv as unknown as ServantSummary[]);
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
    const result = await createServant(name, username, email || null, parseInt(sectorId));
    setGeneratedPassword(result.password || "");
    setName("");
    setUsername("");
    setEmail("");
    setSectorId("");

    // Refresh list
    const srv = await getServants();
    setServants(srv as unknown as ServantSummary[]);
    
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredServants = servants.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                          (s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesMinistry = filterMinistryId === "all" || s.memberships.some(m => m.ministryId === parseInt(filterMinistryId));
    const matchesSector = filterSectorId === "all" || s.memberships.some(m => m.sectorId === parseInt(filterSectorId));
    return matchesSearch && matchesMinistry && matchesSector;
  });

  const formContent = (
    <>
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
          <label>Usuário</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Ex: joao.silva"
            required
          />
        </div>
        <div className="grid" style={{ gap: '0.5rem' }}>
          <label>E-mail (opcional)</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
    </>
  );

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Gestão de Servos</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Cadastre e gerencie os voluntários da sua igreja.</p>
      </header>

      <div className="admin-panel-layout" style={{ '--panel-ratio': '1fr 2.5fr' } as React.CSSProperties}>
        {/* Form */}
        <div className="card glass admin-form-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Servo</h3>
          {formContent}
        </div>

        {/* List */}
        <div className="card glass">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Servos Cadastrados</h3>

            <div className="flex flex-wrap gap-3">
              {/* Ministry Filter */}
              {!isLeader && (
                <div className="flex flex-1" style={{ minWidth: '180px', background: 'var(--muted)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>
                  <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                  <select
                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
                    value={filterMinistryId}
                    onChange={e => {
                      setFilterMinistryId(e.target.value);
                      setFilterSectorId("all"); // Reset sector when ministry changes
                    }}
                  >
                    <option value="all">Todos Ministérios</option>
                    {ministries.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sector Filter */}
              <div className="flex flex-1" style={{ minWidth: '180px', background: 'var(--muted)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>
                <Filter size={14} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                <select
                  style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
                  value={filterSectorId}
                  onChange={e => setFilterSectorId(e.target.value)}
                >
                  <option value="all">Todos Setores</option>
                  {sectors
                    .filter(s => filterMinistryId === "all" || s.ministryId === parseInt(filterMinistryId))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex flex-1" style={{ minWidth: '200px', background: 'var(--muted)', borderRadius: '0.75rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>
                <Search size={16} style={{ marginRight: '0.5rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }} />
                <input
                  placeholder="Pesquisar nome, usuário ou e-mail..."
                  style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', padding: '0.5rem 0', width: '100%' }}
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
                  <th style={{ padding: '1rem 0.5rem' }}>Nome</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Usuário/E-mail</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Setores</th>
                </tr>
              </thead>
              <tbody>
                {filteredServants.map((s) => (
                  <tr
                    key={s.userId}
                    onClick={() => router.push(`/admin/servants/${s.userId}`)}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '1rem 0.5rem' }}>{s.name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--muted-foreground)' }}>{s.username || s.email || "-"}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {s.memberships.map((m) => (
                          <span
                            key={m.servantId}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              background: 'var(--muted)',
                              borderRadius: '1rem'
                            }}
                          >
                            {m.sectorName}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServants.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                      Nenhum servo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-mobile-list">
            {filteredServants.map((s) => (
              <AdminMobileListItem key={s.userId} onClick={() => router.push(`/admin/servants/${s.userId}`)}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <AdminMobileField label="Usuário/E-mail">{s.username || s.email || "-"}</AdminMobileField>
                <AdminMobileField label="Setores">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {s.memberships.map((m) => (
                      <span
                        key={m.servantId}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--muted)', borderRadius: '1rem' }}
                      >
                        {m.sectorName}
                      </span>
                    ))}
                  </div>
                </AdminMobileField>
              </AdminMobileListItem>
            ))}
            {filteredServants.length === 0 && (
              <p style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Nenhum servo encontrado para os filtros selecionados.
              </p>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Cadastrar Novo Servo" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
