"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateSchedule } from "@/lib/actions";
import { X, CalendarPlus, Save, Clock, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface Props {
  schedule: {
    id: number;
    name: string;
    dates: { date: string, startTime: string }[];
  };
  onClose: () => void;
  onSave: () => void;
}

export default function ScheduleEditor({ schedule, onClose, onSave }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState(schedule.name);
  const [dates, setDates] = useState(schedule.dates.map(d => ({ ...d })));
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [loading, setLoading] = useState(false);

  const addDate = () => {
    if (!newDate) return;
    setDates([...dates, { date: newDate, startTime: newStartTime }]);
    setNewDate("");
  };

  const removeDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dates.length === 0) { showToast("Adicione ao menos uma data", "error"); return; }

    setLoading(true);
    try {
      await updateSchedule(schedule.id, name, dates);
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Erro ao atualizar escala", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-2xl max-h-[90vh]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        <div className="flex justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Editar Escala</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Ajuste o nome e os horários disponíveis.</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: '50%', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="grid" style={{ padding: '1.5rem', gap: '1.5rem', overflowY: 'auto' }}>
          <div className="grid" style={{ gap: '0.5rem' }}>
            <label>Nome da Escala</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Escala de Louvor - Junho"
              required
            />
          </div>

          <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarPlus size={18} color="var(--primary)" /> Adicionar Novo Horário
            </h4>
            <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: '1.5fr 1fr auto' }}>
              <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
              <input type="time" className="input" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
              <button type="button" onClick={addDate} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                <CalendarPlus size={20} />
              </button>
            </div>
          </div>

          <div className="grid" style={{ gap: '0.5rem' }}>
            <label>Datas Configuradas</label>
            <div className="grid" style={{ gap: '0.5rem' }}>
              <AnimatePresence mode="popLayout">
                {dates.map((d, i) => (
                  <motion.div
                    layout
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex justify-between items-center"
                    style={{ padding: '0.75rem 1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}
                  >
                    <div className="flex items-center" style={{ gap: '1rem' }}>
                      <div className="flex items-center" style={{ gap: '0.5rem', color: 'var(--primary)' }}>
                        <CalendarIcon size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {new Date(`${d.date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center" style={{ gap: '0.375rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        <Clock size={14} />
                        {d.startTime}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeDate(i)} style={{ color: '#ef4444', padding: '0.25rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex" style={{ gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              <Save size={18} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
