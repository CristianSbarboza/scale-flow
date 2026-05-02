"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getScheduleResponses, assignServant, removeAssignment } from "@/lib/actions";
import { UserPlus, X, Clock, Calendar, CheckCircle2 } from "lucide-react";

interface Props {
  scheduleId: number;
  onClose: () => void;
}

interface ServantInfo {
  id: number;
  user: {
    name: string;
  };
}

interface ResponseDate {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  availabilities: {
    id: number;
    servantId: number;
    servant: ServantInfo;
  }[];
  assignments: {
    id: number;
    servantId: number;
    servant: ServantInfo;
  }[];
}

export default function ScheduleManager({ scheduleId, onClose }: Props) {
  const [dates, setDates] = useState<ResponseDate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getScheduleResponses(scheduleId);
    setDates(data as ResponseDate[]);
    setLoading(false);
  }, [scheduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (dateId: number, servantId: number) => {
    await assignServant(dateId, servantId);
    load();
  };

  const handleRemove = async (assignmentId: number) => {
    await removeAssignment(assignmentId);
    load();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ 
          padding: 0, 
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '-0.02em' }}>Gestão de Disponibilidade</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Visualize as respostas e escale os servos para cada data.</p>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost"
            style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
              <p style={{ color: 'var(--muted-foreground)' }}>Carregando dados da escala...</p>
            </div>
          ) : (
            <div className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              <AnimatePresence mode="popLayout">
                {dates.map((d) => (
                  <motion.div 
                    layout
                    key={d.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card" 
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.75rem', color: 'white' }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                          <Clock size={12} /> {d.startTime} - {d.endTime}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Assigned Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Confirmados ({d.assignments.length})</span>
                        </div>
                        <div className="grid gap-2">
                          {d.assignments.map((as) => (
                            <motion.div 
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              key={as.id} 
                              className="flex justify-between items-center p-2.5 rounded-lg" 
                              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} color="#10b981" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{as.servant.user.name}</span>
                              </div>
                              <button 
                                onClick={() => handleRemove(as.id)} 
                                className="hover:text-red-400 transition-colors"
                                title="Remover da escala"
                              >
                                <X size={16} />
                              </button>
                            </motion.div>
                          ))}
                          {d.assignments.length === 0 && (
                            <div style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Nenhum servo confirmado</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Available Section */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Disponíveis</span>
                        <div className="grid gap-2">
                          {d.availabilities
                            .filter((av) => !d.assignments.some((as) => as.servantId === av.servantId))
                            .map((av) => (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={av.id} 
                                className="flex justify-between items-center p-2.5 rounded-lg" 
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <span style={{ fontSize: '0.875rem' }}>{av.servant.user.name}</span>
                                <button 
                                  onClick={() => handleAssign(d.id, av.servantId)} 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto', borderRadius: '0.5rem' }}
                                >
                                  <UserPlus size={12} style={{ marginRight: '0.4rem' }} /> Escalar
                                </button>
                              </motion.div>
                            ))}
                          {d.availabilities.length === 0 && d.assignments.length === 0 && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic', textAlign: 'center' }}>Aguardando respostas...</p>
                          )}
                          {d.availabilities.length > 0 && d.availabilities.every(av => d.assignments.some(as => as.servantId === av.servantId)) && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic', textAlign: 'center' }}>Todos os disponíveis foram escalados</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer info */}
        {!loading && (
          <div className="p-4 bg-white/5 border-t border-white/10 flex justify-center">
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              As alterações são salvas automaticamente e refletidas na agenda dos servos.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
