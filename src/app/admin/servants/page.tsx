"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createServant, getServants } from "@/lib/actions/servants";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import { UserPlus, Copy, Check, ShieldAlert, Plus } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
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
      <form onSubmit={handleCreate} className="grid gap-6">
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>Nome Completo</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>Usuário</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Ex: joao.silva"
            required
          />
        </div>
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>E-mail (opcional)</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
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
          <div className="flex items-center gap-4" style={{ color: 'var(--accent)' }}>
            <ShieldAlert size={18} />
            <span style={{ fontWeight: 600 }}>Senha de Primeiro Acesso</span>
          </div>
          <p style={{ fontSize: '0.875rem' }}>Passe esta senha ao servo. Ele poderá alterá-la após o login.</p>
          <div className="flex items-center gap-4 justify-between" style={{
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

      <div className="admin-panel-layout">
        {/* Form */}
        <div className="card glass admin-form-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Servo</h3>
          {formContent}
        </div>

        {/* List */}
        <DataPanel
          title="Servos Cadastrados"
          stackToolbar
          toolbar={
            <>
              {!isLeader && (
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
                placeholder="Pesquisar nome, usuário ou e-mail..."
              />
            </>
          }
          rows={filteredServants}
          rowKey={(s) => s.userId}
          onRowClick={(s) => router.push(`/admin/servants/${s.userId}`)}
          empty="Nenhum servo encontrado para os filtros selecionados."
          columns={[
            { header: "Nome", primary: true, cell: (s) => s.name },
            {
              header: "Usuário/E-mail",
              cell: (s) => <span className="text-muted-foreground">{s.username || s.email || "-"}</span>,
            },
            {
              header: "Setores",
              cell: (s) => (
                <div className="flex flex-wrap gap-1.5">
                  {s.memberships.map((m) => (
                    <span key={m.servantId} className="rounded-full bg-muted px-2 py-1 text-xs">
                      {m.sectorName}
                    </span>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Cadastrar Novo Servo" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
