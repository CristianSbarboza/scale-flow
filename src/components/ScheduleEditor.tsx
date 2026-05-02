"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateSchedule } from "@/lib/actions";
import { X, CalendarPlus, Save, Clock, Calendar as CalendarIcon, Trash2 } from "lucide-react";

interface Props {
  schedule: {
    id: number;
    name: string;
    dates: { date: string, startTime: string, endTime: string }[];
  };
  onClose: () => void;
  onSave: () => void;
}

export default function ScheduleEditor({ schedule, onClose, onSave }: Props) {
  const [name, setName] = useState(schedule.name);
  const [dates, setDates] = useState(schedule.dates.map(d => ({ ...d })));
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [loading, setLoading] = useState(false);

  const addDate = () => {
    if (!newDate) return;
    setDates([...dates, { date: newDate, startTime: newStartTime, endTime: newEndTime }]);
    setNewDate("");
  };

  const removeDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dates.length === 0) return alert("Adicione ao menos uma data");
    
    setLoading(true);
    try {
      await updateSchedule(schedule.id, name, dates);
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar escala");
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
        className="glass w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ 
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Editar Escala</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Ajuste o nome e os horários disponíveis.</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: '50%' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="grid gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nome da Escala</label>
            <input 
              className="input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Escala de Louvor - Junho"
              required 
            />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarPlus size={18} color="var(--primary)" /> Adicionar Novo Horário
            </h4>
            <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: '1.5fr 1fr 1fr auto' }}>
              <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
              <input type="time" className="input" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
              <input type="time" className="input" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} />
              <button type="button" onClick={addDate} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                <CalendarPlus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Datas Configuradas</label>
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {dates.map((d, i) => (
                  <motion.div 
                    layout
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex justify-between items-center p-3 rounded-lg" 
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                        <CalendarIcon size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                        <Clock size={14} />
                        {d.startTime} - {d.endTime}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeDate(i)} style={{ color: '#ef4444', padding: '0.25rem' }} className="hover:bg-red-500/10 rounded">
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-white/10 flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              <Save size={18} style={{ marginRight: '0.5rem' }} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
