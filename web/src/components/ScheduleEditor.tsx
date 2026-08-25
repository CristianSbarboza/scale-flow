"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateSchedule } from "@/lib/actions/schedules";
import { CalendarPlus, Save, Clock, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import VisibilityToggle, { ScheduleVisibility } from "@/components/VisibilityToggle";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import SelectField from "@/components/ui/SelectField";

interface Props {
  schedule: {
    id: number;
    name: string;
    visibility: ScheduleVisibility;
    /** Opcionais: quem não sabe onde a escala está também não pode movê-la. */
    ministryId?: number;
    sectorId?: number;
    dates: { date: string, startTime: string }[];
  };
  /**
   * Sem estas duas listas o editor não oferece a troca de ministério/setor.
   * É o caso do painel do coordenador, que administra um setor só — mover a
   * escala para fora dele não é decisão dele.
   */
  ministries?: { id: number, name: string }[];
  sectors?: { id: number, name: string, ministryId: number }[];
  onClose: () => void;
  onSave: () => void;
}

export default function ScheduleEditor({ schedule, ministries, sectors, onClose, onSave }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState(schedule.name);
  const [visibility, setVisibility] = useState<ScheduleVisibility>(schedule.visibility);
  const [dates, setDates] = useState(schedule.dates.map(d => ({ ...d })));

  // Só dá para mover com as listas em mãos e sabendo de onde a escala sai.
  const podeMover =
    ministries !== undefined && sectors !== undefined &&
    schedule.ministryId !== undefined && schedule.sectorId !== undefined;
  const [ministryId, setMinistryId] = useState(String(schedule.ministryId ?? ""));
  const [sectorId, setSectorId] = useState(String(schedule.sectorId ?? ""));

  const setoresDoMinisterio = (sectors ?? []).filter(
    (sec) => String(sec.ministryId) === ministryId,
  );
  const mudouDeSetor = podeMover && sectorId !== String(schedule.sectorId);

  // Trocar de ministério invalida o setor escolhido: ele é de outro ministério.
  // Se o novo ministério tiver um setor só, adianta e já seleciona.
  const handleMinistryChange = (novo: string) => {
    setMinistryId(novo);
    const doNovo = (sectors ?? []).filter((sec) => String(sec.ministryId) === novo);
    setSectorId(doNovo.length === 1 ? String(doNovo[0].id) : "");
  };
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
    if (podeMover && !sectorId) { showToast("Escolha o setor da escala", "error"); return; }

    setLoading(true);
    try {
      await updateSchedule(
        schedule.id, name, dates, visibility,
        podeMover ? { ministryId: Number(ministryId), sectorId: Number(sectorId) } : undefined,
      );
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao atualizar escala", "error");
    } finally {
      setLoading(false);
    }
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
        className="glass w-full max-w-2xl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Editar Escala</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              {podeMover
                ? "Ajuste o nome, onde ela fica e os horários disponíveis."
                : "Ajuste o nome e os horários disponíveis."}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <form onSubmit={handleUpdate} className="grid gap-6" style={{ padding: '1.5rem', gap: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label>Nome da Escala</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Escala de Louvor - Junho"
              required
            />
          </div>

          {podeMover && (
            <div className="grid gap-6" style={{ gap: '0.5rem' }}>
              <div className="grid gap-6" style={{ gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                <SelectField
                  label="Ministério"
                  value={ministryId}
                  onChange={handleMinistryChange}
                  options={(ministries ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  required
                />
                <SelectField
                  label="Setor"
                  value={sectorId}
                  onChange={setSectorId}
                  placeholder={setoresDoMinisterio.length === 0 ? "Nenhum setor" : "Selecionar"}
                  options={setoresDoMinisterio.map((sec) => ({ value: sec.id, label: sec.name }))}
                  required
                />
              </div>
              {mudouDeSetor && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                  Ao salvar, a escala passa a ser do novo setor: quem responde a
                  disponibilidade passa a ser os servos de lá, e as respostas e
                  escalações atuais são descartadas.
                </p>
              )}
            </div>
          )}

          <VisibilityToggle value={visibility} onChange={setVisibility} />

          <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarPlus size={18} color="var(--primary)" /> Adicionar Novo Horário
            </h4>
            <div className="grid gap-6" style={{ gap: '0.5rem', gridTemplateColumns: '1.5fr 1fr auto' }}>
              <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
              <input type="time" className="input" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
              <Button variant="primary" type="button" onClick={addDate}  style={{ padding: '0.5rem' }}>
                <CalendarPlus size={20} />
              </Button>
            </div>
          </div>

          <div className="grid gap-6" style={{ gap: '0.5rem' }}>
            <label>Datas Configuradas</label>
            <div className="grid gap-6" style={{ gap: '0.5rem' }}>
              <AnimatePresence mode="popLayout">
                {dates.map((d, i) => (
                  <motion.div
                    layout
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-4 justify-between items-center"
                    style={{ padding: '0.75rem 1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}
                  >
                    <div className="flex items-center gap-4 items-center" style={{ gap: '1rem' }}>
                      <div className="flex items-center gap-4 items-center" style={{ gap: '0.5rem', color: 'var(--primary)' }}>
                        <CalendarIcon size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {new Date(`${d.date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 items-center" style={{ gap: '0.375rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        <Clock size={14} />
                        {d.startTime.slice(0, 5)}
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

          <div className="flex items-center gap-4" style={{ gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Button variant="secondary" type="button" onClick={onClose}  style={{ flex: 1 }}>Cancelar</Button>
            <Button variant="primary" type="submit"  style={{ flex: 2 }} disabled={loading}>
              <Save size={18} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
}
