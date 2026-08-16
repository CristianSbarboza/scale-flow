"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createMinistry, getMinistries } from "@/lib/actions/ministries";
import { Church, Plus, ShieldAlert, Check, Copy } from "lucide-react";
import DataPanel from "@/components/ui/DataPanel";
import SearchInput from "@/components/ui/SearchInput";
import AdminCreateModal from "@/components/AdminCreateModal";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

interface Ministry {
  id: number;
  name: string;
  description: string | null;
  leader: {
    name: string;
    email: string;
  };
  sectors: {
    id: number;
    name: string;
    servants: {
      id: number;
      user: { name: string; username: string | null; email: string | null };
    }[];
  }[];
}

export default function MinistriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    if (status === "authenticated" && session?.user.role !== "admin") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const min = await getMinistries();
        if (isMounted) {
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
    const result = await createMinistry(name, description, leaderName, leaderEmail);
    
    if (result.password) {
      setGeneratedPassword(result.password);
    } else {
      setGeneratedPassword("");
    }

    setName("");
    setDescription("");
    setLeaderName("");
    setLeaderEmail("");
    
    const min = await getMinistries();
    setMinistries(min as unknown as Ministry[]);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredMinistries = ministries.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (status !== "authenticated" || session?.user.role !== "admin") {
    return null;
  }

  const formContent = (
    <>
      <form onSubmit={handleCreate} className="grid gap-6">
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>Nome do Ministério</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Adoração" required />
        </div>
        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
          <label>Descrição</label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Opcional..." />
        </div>
        <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--muted)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>DADOS DO LÍDER</p>
          <div className="grid gap-6" style={{ gap: '1rem' }}>
            <div className="grid gap-6" style={{ gap: '0.5rem' }}>
              <label>Nome do Líder</label>
              <input className="input" value={leaderName} onChange={e => setLeaderName(e.target.value)} required />
            </div>
            <div className="grid gap-6" style={{ gap: '0.5rem' }}>
              <label>Email do Líder</label>
              <input className="input" type="email" value={leaderEmail} onChange={e => setLeaderEmail(e.target.value)} required />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          <Plus size={18} />
          {loading ? "Salvando..." : "Adicionar Ministério"}
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
            <span style={{ fontWeight: 600 }}>Senha Gerada para o Líder</span>
          </div>
          <p style={{ fontSize: '0.875rem' }}>Esta pessoa é nova no sistema. Passe esta senha para ela logar.</p>
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
        <h1 style={{ fontSize: '2rem' }}>Ministérios</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Gerencie os ministérios da sua igreja.</p>
      </header>

      <div className="admin-panel-layout">
        <div className="card glass admin-form-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Novo Ministério</h3>
          {formContent}
        </div>

        <DataPanel
          title="Ministérios Cadastrados"
          toolbar={<SearchInput value={searchTerm} onChange={setSearchTerm} />}
          rows={filteredMinistries}
          rowKey={(m) => m.id}
          onRowClick={(m) => router.push(`/admin/ministries/${m.id}`)}
          empty="Nenhum ministério encontrado para a pesquisa."
          columns={[
            {
              header: "Ministério",
              primary: true,
              cell: (m) => (
                <div className="flex items-center gap-2">
                  <Church size={14} className="text-primary" />
                  <span>{m.name}</span>
                </div>
              ),
            },
            {
              header: "Líder",
              cell: (m) => <span className="text-muted-foreground">{m.leader?.name || "N/A"}</span>,
            },
            {
              header: "Setores",
              cell: (m) => (
                <span className="rounded-full bg-muted px-2 py-1 text-xs">{m.sectors?.length || 0}</span>
              ),
            },
            {
              header: "Servos",
              cell: (m) => (
                <span className="text-muted-foreground">
                  {m.sectors?.reduce((acc, sec) => acc + (sec.servants?.length || 0), 0) || 0}
                </span>
              ),
            },
          ]}
        />
      </div>

      {showCreateModal && (
        <AdminCreateModal title="Novo Ministério" onClose={() => setShowCreateModal(false)}>
          {formContent}
        </AdminCreateModal>
      )}
    </div>
  );
}
