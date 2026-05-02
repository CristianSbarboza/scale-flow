"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, LayoutGrid, Users, Mail, Church, ArrowUpRight, Edit3, Save, ShieldAlert, Copy, Check } from "lucide-react";
import { updateMinistry } from "@/lib/actions";

interface Props {
  ministry: {
    id: number;
    name: string;
    description: string | null;
    leader: { name: string, email: string };
    sectors: {
      id: number;
      name: string;
      servants: {
        id: number;
        user: { name: string, email: string };
      }[];
    }[];
  };
  onClose: () => void;
}

export default function MinistryDetails({ ministry, onClose }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [name, setName] = useState(ministry.name);
  const [description, setDescription] = useState(ministry.description || "");
  const [leaderName, setLeaderName] = useState(ministry.leader.name);
  const [leaderEmail, setLeaderEmail] = useState(ministry.leader.email);

  const allServants = (ministry.sectors || []).flatMap(s => (s.servants || []).map(srv => ({
    ...srv,
    sectorName: s.name
  })));

  const handleUpdate = async () => {
    setLoading(true);
    const result = await updateMinistry(ministry.id, name, description, leaderName, leaderEmail);
    
    if (result?.password) {
      setGeneratedPassword(result.password);
      setLoading(false);
      // Mantém aberto para mostrar a senha
    } else {
      setLoading(false);
      setIsEditing(false);
      onClose();
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-4xl h-full bg-(--background) border-l border-(--border) flex flex-col shadow-2xl"
      >
        <div className="flex justify-between items-center px-12 py-10 border-b border-(--border)">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-(--radius) bg-(--primary)/10 border border-(--primary)/20 flex items-center justify-center text-(--primary)">
              <Church size={24} />
            </div>
            <div>
              {isEditing ? (
                <input 
                  className="input text-2xl! font-bold p-2! h-auto"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              ) : (
                <h2 className="text-3xl font-bold text-white tracking-tight">{ministry.name}</h2>
              )}
              <p className="text-(--muted-foreground) text-xs font-semibold uppercase tracking-widest mt-1">Gestão de Ministério</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!generatedPassword && (
              <button 
                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)} 
                disabled={loading}
                className={`btn ${isEditing ? 'btn-primary' : 'btn-ghost border border-(--border)'}`}
              >
                {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
                <span className="hidden sm:inline">{isEditing ? (loading ? "Salvando..." : "Salvar") : "Editar"}</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="btn btn-ghost border border-(--border)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          
          {generatedPassword && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card glass border-(--primary)/40 mb-8 p-8! bg-(--primary)/5"
            >
              <div className="flex items-center gap-3 text-(--primary) mb-4">
                <ShieldAlert size={24} />
                <h3 className="text-lg font-bold uppercase tracking-tight">Nova Senha Gerada!</h3>
              </div>
              <p className="text-sm text-(--muted-foreground) mb-6">
                Este novo líder ainda não existia no sistema. Por favor, copie e envie esta senha para que ele possa realizar o primeiro acesso:
              </p>
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-(--radius) border border-(--border)">
                <code className="text-2xl font-bold text-(--primary) tracking-wider">{generatedPassword}</code>
                <button 
                  onClick={copyPassword}
                  className="btn btn-ghost text-(--primary) hover:bg-(--primary)/10"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <button 
                onClick={() => { setGeneratedPassword(null); setIsEditing(false); onClose(); }}
                className="btn btn-primary w-full mt-6"
              >
                Entendi, pode fechar
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-4">
              <h3 className="text-(--primary) text-[11px] font-bold uppercase tracking-[0.2em]">Descrição</h3>
              {isEditing ? (
                <textarea 
                  className="input h-32 leading-relaxed"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              ) : (
                <p className="text-(--muted-foreground) text-lg leading-relaxed">
                  {ministry.description || "Gerenciamento estratégico e visão ministerial deste departamento."}
                </p>
              )}
            </div>

            <div className="col-span-4 space-y-4">
              <h3 className="text-(--primary) text-[11px] font-bold uppercase tracking-[0.2em]">Responsável</h3>
              <div className="card glass p-6! space-y-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <input className="input p-2! text-sm" value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="Nome" />
                    <input className="input p-2! text-sm" value={leaderEmail} onChange={e => setLeaderEmail(e.target.value)} placeholder="E-mail" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-(--radius) bg-(--primary) flex items-center justify-center text-white font-bold">
                        {ministry.leader.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{ministry.leader.name}</p>
                        <p className="text-[10px] text-(--muted-foreground) uppercase">Líder Geral</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-(--muted-foreground) pt-4 border-t border-(--border)">
                      <Mail size={14} />
                      {ministry.leader.email}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-span-12 grid grid-cols-2 gap-6">
              <div className="card p-8! border-l-4 border-l-(--primary)">
                <p className="text-(--muted-foreground) text-[10px] font-bold uppercase tracking-widest mb-1">Setores</p>
                <p className="text-4xl font-bold text-white">{ministry.sectors?.length || 0}</p>
              </div>
              <div className="card p-8! border-l-4 border-l-(--primary)">
                <p className="text-(--muted-foreground) text-[10px] font-bold uppercase tracking-widest mb-1">Total de Servos</p>
                <p className="text-4xl font-bold text-white">{allServants.length}</p>
              </div>
            </div>

            <div className="col-span-12 space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <LayoutGrid size={18} className="text-(--primary)" />
                <h3 className="text-white text-sm font-bold uppercase tracking-widest">Divisão por Setores</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(ministry.sectors || []).map(s => (
                  <div key={s.id} className="card hover:border-(--primary)/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <ArrowUpRight size={16} className="text-(--muted-foreground) group-hover:text-(--primary)" />
                      <span className="text-2xl font-bold text-white">{s.servants?.length || 0}</span>
                    </div>
                    <p className="font-bold text-white group-hover:text-(--primary)">{s.name}</p>
                    <p className="text-[10px] text-(--muted-foreground) uppercase mt-1">Servos</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-(--primary)" />
                <h3 className="text-white text-sm font-bold uppercase tracking-widest">Servos do Ministério</h3>
              </div>
              <div className="card p-0! overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-(--muted) text-(--muted-foreground) text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-8 py-4 text-left">Servo</th>
                      <th className="px-8 py-4 text-right">Setor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {allServants.map((srv, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors text-sm">
                        <td className="px-8 py-5">
                          <p className="font-bold text-white">{srv.user.name}</p>
                          <p className="text-(--muted-foreground) text-xs">{srv.user.email}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="inline-block px-3 py-1 rounded-full bg-(--muted) text-[10px] font-bold">
                            {srv.sectorName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}
