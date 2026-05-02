"use client";

import { useState, useEffect } from "react";
import { createMinistry, getMinistries } from "@/lib/actions";
import { Church, Plus, ShieldAlert, Check, Copy } from "lucide-react";
import MinistryDetails from "@/components/MinistryDetails";
import { AnimatePresence } from "framer-motion";

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
      user: { name: string; email: string };
    }[];
  }[];
}

export default function MinistriesPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Ministérios</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Gerencie os ministérios da sua igreja.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Novo Ministério</h3>
          <form onSubmit={handleCreate} className="grid">
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Nome do Ministério</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Adoração" required />
            </div>
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Descrição</label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Opcional..." />
            </div>
            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>DADOS DO LÍDER</p>
              <div className="grid" style={{ gap: '1rem' }}>
                <div className="grid" style={{ gap: '0.5rem' }}>
                  <label>Nome do Líder</label>
                  <input className="input" value={leaderName} onChange={e => setLeaderName(e.target.value)} required />
                </div>
                <div className="grid" style={{ gap: '0.5rem' }}>
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
              <div className="flex" style={{ color: 'var(--accent)' }}>
                <ShieldAlert size={18} />
                <span style={{ fontWeight: 600 }}>Senha Gerada para o Líder</span>
              </div>
              <p style={{ fontSize: '0.875rem' }}>Esta pessoa é nova no sistema. Passe esta senha para ela logar.</p>
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

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignContent: 'start', gap: '1.5rem' }}>
          {ministries.map((m) => (
            <div 
              key={m.id} 
              className="card glass cursor-pointer hover:border-primary/50 transition-colors" 
              onClick={() => setSelectedMinistry(m)}
            >
              <Church size={24} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{m.name}</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', minHeight: '2.5rem' }}>{m.description || "Sem descrição"}</p>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Líder Responsável:</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{m.leader?.name || "N/A"}</p>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                {m.sectors?.length || 0} setores • {m.sectors?.reduce((acc, s) => acc + (s.servants?.length || 0), 0)} servos
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedMinistry && (
          <MinistryDetails 
            ministry={selectedMinistry} 
            onClose={() => setSelectedMinistry(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
