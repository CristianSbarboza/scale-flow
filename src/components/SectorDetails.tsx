"use client";

import { motion } from "framer-motion";
import { X, LayoutGrid, Users, Activity } from "lucide-react";

interface Props {
  sector: {
    id: number;
    name: string;
    ministry: { name: string };
    servants: {
      id: number;
      user: { name: string, email: string };
    }[];
  };
  onClose: () => void;
}

export default function SectorDetails({ sector, onClose }: Props) {
  const servants = sector.servants || [];

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
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">{sector.name}</h2>
              <p className="text-(--muted-foreground) text-xs font-semibold uppercase tracking-widest mt-1">
                {sector.ministry.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost border border-(--border)"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="grid grid-cols-12 gap-8">
            
            <div className="col-span-12 grid grid-cols-2 gap-6 py-8 border-b border-(--border)">
              <div className="space-y-1">
                <p className="text-(--muted-foreground) text-[10px] font-bold uppercase tracking-widest">Total de Servos</p>
                <p className="text-5xl font-bold text-white tabular-nums">{servants.length}</p>
              </div>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-(--primary)/10 border border-(--primary)/20 text-(--primary) text-[10px] font-bold uppercase tracking-widest">
                  <Activity size={12} /> Setor Ativo
                </div>
              </div>
            </div>

            <div className="col-span-12 space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-(--primary)" />
                <h3 className="text-white text-sm font-bold uppercase tracking-widest">Servos do Setor</h3>
              </div>

              <div className="card p-0! overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-(--muted) text-(--muted-foreground) text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-10 py-5 text-left">Identificação</th>
                      <th className="px-10 py-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {servants.map((srv, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-10 py-6">
                          <p className="text-lg font-bold text-white group-hover:text-(--primary) transition-colors">{srv.user.name}</p>
                          <p className="text-sm text-(--muted-foreground)">{srv.user.email}</p>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <span className="text-[10px] font-bold text-(--primary)/60 group-hover:text-(--primary) uppercase tracking-widest">Ativo</span>
                        </td>
                      </tr>
                    ))}
                    {servants.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-16 text-center text-(--muted-foreground) italic text-sm">
                          Nenhum servo vinculado a este setor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div className="px-12 py-8 border-t border-(--border) flex justify-between items-center opacity-20 hover:opacity-50 transition-opacity">
          <span className="text-[10px] font-bold tracking-[0.5em] text-white uppercase">SFLOW ADMIN</span>
          <div className="flex gap-4">
            <div className="w-1 h-1 rounded-full bg-(--primary)" />
            <div className="w-1 h-1 rounded-full bg-(--primary)" />
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
