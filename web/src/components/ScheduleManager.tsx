"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getScheduleResponses, getScheduleSectorServants } from "@/lib/actions/schedules";
import LoadingDots from "@/components/ui/LoadingDots";
import { assignServant, removeAssignment } from "@/lib/actions/availability";
import { UserPlus, X, Clock, Calendar, CheckCircle2, Plus } from "lucide-react";
import type { SectorServantOption } from "@/types/domain";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";

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
  const [sectorServants, setSectorServants] = useState<SectorServantOption[]>([]);
  const [loading, setLoading] = useState(true);
  /** Data cujo seletor de "escalar mesmo sem resposta" está aberto. */
  const [addingFor, setAddingFor] = useState<number | null>(null);
  /** `dateId:servantId` em voo, para não escalar duas vezes no clique repetido. */
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [data, servos] = await Promise.all([
      getScheduleResponses(schedule.id),
      getScheduleSectorServants(schedule.id),
    ]);
    setDates(data as ResponseDate[]);
    setSectorServants(servos);
    setLoading(false);
  }, [schedule.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleAssign = async (dateId: number, servantId: number) => {
    setAssigning(`${dateId}:${servantId}`);
    try {
      await assignServant(dateId, servantId);
      await load();
    } finally {
      setAssigning(null);
    }
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
            <div className="flex items-center gap-4 items-center" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
              <span className="flex items-center gap-4 items-center" style={{ gap: '0.375rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                <Calendar size={14} /> {schedule.dates.length} {schedule.dates.length === 1 ? 'data' : 'datas'}
              </span>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}
            
            style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', scrollbarWidth: 'thin', flex: '1 1 auto', minHeight: 0 }}>
          <label style={{ display: 'block', marginBottom: '1rem' }}>Respostas e Escalação</label>
          {loading ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <LoadingDots label="Carregando dados da escala" />
            </div>
          ) : (
            <div className="grid gap-6" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              <AnimatePresence mode="popLayout">
                {dates.map((d) => {
                  const escalados = new Set(d.assignments.map((a) => a.servantId));
                  const responderam = new Set(d.availabilities.map((av) => av.servantId));
                  // Quem ainda pode entrar neste dia: o setor inteiro menos quem
                  // já está escalado. Não filtra por disponibilidade de
                  // propósito — o seletor existe justamente para a emergência em
                  // que a pessoa não conseguiu responder.
                  const escalaveis = sectorServants.filter((sv) => !escalados.has(sv.servantId));
                  const seletorAberto = addingFor === d.id;

                  return (
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {new Date(`${d.date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </h4>
                        <div className="flex items-center gap-4 items-center" style={{ gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          <Clock size={12} /> {d.startTime.slice(0, 5)}
                        </div>
                      </div>
                      <IconButton
                        label={seletorAberto ? 'Fechar a lista do setor' : 'Escalar alguém do setor'}
                        tone={seletorAberto ? 'primary' : 'muted'}
                        aria-expanded={seletorAberto}
                        onClick={() => setAddingFor(seletorAberto ? null : d.id)}
                        className="shrink-0 border border-border"
                      >
                        <Plus
                          size={18}
                          style={{ transition: 'transform 150ms', transform: seletorAberto ? 'rotate(45deg)' : 'none' }}
                        />
                      </IconButton>
                    </div>

                    <AnimatePresence initial={false}>
                      {seletorAberto && (
                        <motion.div
                          key="seletor"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--muted)', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.625rem' }}>
                              Todo o setor. Dá para escalar quem não informou disponibilidade.
                            </p>
                            <div className="grid gap-6" style={{ gap: '0.375rem', maxHeight: '13rem', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                              {escalaveis.map((sv) => (
                                <button
                                  key={sv.servantId}
                                  onClick={() => handleAssign(d.id, sv.servantId)}
                                  disabled={assigning !== null}
                                  className="flex items-center gap-4 justify-between items-center disabled:cursor-not-allowed disabled:opacity-60 hover:bg-card"
                                  style={{ padding: '0.5rem 0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'left', transition: 'background 150ms' }}
                                >
                                  <span style={{ fontSize: '0.875rem' }}>{sv.name}</span>
                                  {responderam.has(sv.servantId) ? (
                                    <span style={{ fontSize: '0.6875rem', color: '#10b981', flexShrink: 0 }}>disponível</span>
                                  ) : (
                                    <UserPlus size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                                  )}
                                </button>
                              ))}
                              {escalaveis.length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic', textAlign: 'center' }}>
                                  {sectorServants.length === 0
                                    ? 'Este setor ainda não tem servos cadastrados.'
                                    : 'Todo o setor já está escalado neste dia.'}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid gap-6" style={{ gap: '1rem' }}>
                      {/* Assigned Section */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                          Confirmados ({d.assignments.length})
                        </span>
                        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
                          {d.assignments.map((as) => (
                            <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              key={as.id}
                              className="flex items-center gap-4 justify-between items-center"
                              style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
                            >
                              <div className="flex items-center gap-4 items-center" style={{ gap: '0.5rem' }}>
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
                        <div className="grid gap-6" style={{ gap: '0.5rem' }}>
                          {d.availabilities
                            .filter((av) => !d.assignments.some((as) => as.servantId === av.servantId))
                            .map((av) => (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={av.id}
                                className="flex items-center gap-4 justify-between items-center"
                                style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}
                              >
                                <span style={{ fontSize: '0.875rem' }}>{av.servant.user.name}</span>
                                <Button variant="primary" onClick={() => handleAssign(d.id, av.servantId)}
                                  disabled={assigning !== null}
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}>
                                  <UserPlus size={12} /> Escalar
                                </Button>
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
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer info */}
        {!loading && (
          <div className="flex items-center gap-4 justify-center" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
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
