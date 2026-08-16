"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getScheduleResponses } from "@/lib/actions/schedules";
import { assignServant, removeAssignment } from "@/lib/actions/availability";
import { UserPlus, X, Clock, Calendar, CheckCircle2 } from "lucide-react";

interface ScheduleSummary {
  id: number;
  name: string;
  status: "draft" | "published";
  ministry: { name: string };
  sector: { name: string };
  dates: { id: number }[];
}

interface Props {
  schedule: ScheduleSummary;
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

export default function ScheduleManager({ schedule, onClose }: Props) {
  const [dates, setDates] = useState<ResponseDate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getScheduleResponses(schedule.id);
    setDates(data as ResponseDate[]);
    setLoading(false);
  }, [schedule.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-5xl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          maxHeight: '90vh',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>{schedule.name}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              {schedule.ministry.name} · {schedule.sector.name}
            </p>
            <div className="flex items-center" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
              <span className="flex items-center" style={{ gap: '0.375rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                <Calendar size={14} /> {schedule.dates.length} {schedule.dates.length === 1 ? 'data' : 'datas'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', scrollbarWidth: 'thin', flex: '1 1 auto', minHeight: 0 }}>
          <label style={{ display: 'block', marginBottom: '1rem' }}>Respostas e Escalação</label>
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
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius)', color: 'white' }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {new Date(`${d.date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </h4>
                        <div className="flex items-center" style={{ gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          <Clock size={12} /> {d.startTime.slice(0, 5)}
                        </div>
                      </div>
                    </div>

                    <div className="grid" style={{ gap: '1rem' }}>
                      {/* Assigned Section */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                          Confirmados ({d.assignments.length})
                        </span>
                        <div className="grid" style={{ gap: '0.5rem' }}>
                          {d.assignments.map((as) => (
                            <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              key={as.id}
                              className="flex justify-between items-center"
                              style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
                            >
                              <div className="flex items-center" style={{ gap: '0.5rem' }}>
                                <CheckCircle2 size={14} color="#10b981" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{as.servant.user.name}</span>
                              </div>
                              <button
                                onClick={() => handleRemove(as.id)}
                                style={{ color: 'var(--muted-foreground)' }}
                                title="Remover da escala"
                              >
                                <X size={16} />
                              </button>
                            </motion.div>
                          ))}
                          {d.assignments.length === 0 && (
                            <div style={{ padding: '0.75rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Nenhum servo confirmado</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Available Section */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                          Disponíveis
                        </span>
                        <div className="grid" style={{ gap: '0.5rem' }}>
                          {d.availabilities
                            .filter((av) => !d.assignments.some((as) => as.servantId === av.servantId))
                            .map((av) => (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={av.id}
                                className="flex justify-between items-center"
                                style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}
                              >
                                <span style={{ fontSize: '0.875rem' }}>{av.servant.user.name}</span>
                                <button
                                  onClick={() => handleAssign(d.id, av.servantId)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}
                                >
                                  <UserPlus size={12} /> Escalar
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
          <div className="flex justify-center" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              As alterações são salvas automaticamente e refletidas na agenda dos servos.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
