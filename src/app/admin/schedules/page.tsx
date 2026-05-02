"use client";

import { useState, useEffect } from "react";
import { createSchedule, getSchedules, getSectors, getMinistries, deleteSchedule } from "@/lib/actions";
import { CalendarPlus, Link as LinkIcon, Calendar, Trash2, Copy, Edit3 } from "lucide-react";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleEditor from "@/components/ScheduleEditor";

interface ScheduleDate {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface Schedule {
  id: number;
  name: string;
  status: "draft" | "published";
  shareLink: string;
  ministry: { name: string };
  sector: { name: string };
  dates: ScheduleDate[];
}

interface Sector {
  id: number;
  name: string;
  ministryId: number;
}

interface Ministry {
  id: number;
  name: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [name, setName] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [dates, setDates] = useState<{ date: string, startTime: string, endTime: string }[]>([]);
  
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  
  const [lastLink, setLastLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [managingSchedule, setManagingSchedule] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const sch = await getSchedules();
        const sec = await getSectors();
        const min = await getMinistries();
        if (isMounted) {
          setSchedules(sch as unknown as Schedule[]);
          setSectors(sec as unknown as Sector[]);
          setMinistries(min as unknown as Ministry[]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const addDate = () => {
    if (!newDate) return;
    setDates([...dates, { date: newDate, startTime: newStartTime, endTime: newEndTime }]);
    setNewDate("");
  };

  const removeDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dates.length === 0) return alert("Adicione ao menos uma data");
    
    setLoading(true);
    const result = await createSchedule(name, parseInt(ministryId), parseInt(sectorId), dates);
    setLastLink(`${window.location.origin}/escala/${result.shareLink}`);
    
    setName("");
    setMinistryId("");
    setSectorId("");
    setDates([]);
    
    const sch = await getSchedules();
    setSchedules(sch as unknown as Schedule[]);
    setLoading(false);
  };

  const handleEdit = (s: Schedule) => {
    setEditingSchedule(s);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta escala?")) return;
    await deleteSchedule(id);
    const sch = await getSchedules();
    setSchedules(sch as unknown as Schedule[]);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Escalas</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Crie escalas e envie o link para os servos selecionarem suas datas.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Create Form */}
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Criar Nova Escala</h3>
          <form onSubmit={handleCreate} className="grid">
            <div className="grid" style={{ gap: '0.5rem' }}>
              <label>Nome da Escala (ex: Escala de Maio)</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            
            <div className="grid" style={{ gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <div className="grid" style={{ gap: '0.5rem' }}>
                <label>Ministério</label>
                <select className="input" value={ministryId} onChange={e => setMinistryId(e.target.value)} required>
                  <option value="">Selecionar</option>
                  {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid" style={{ gap: '0.5rem' }}>
                <label>Setor</label>
                <select className="input" value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                  <option value="">Selecionar</option>
                  {sectors.filter(s => s.ministryId === parseInt(ministryId)).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)', marginTop: '0.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Adicionar Datas e Horários</h4>
              <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: '2fr 1fr 1fr auto' }}>
                <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
                <input type="time" className="input" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
                <input type="time" className="input" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} />
                <button type="button" onClick={addDate} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                  <CalendarPlus size={20} />
                </button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                {dates.map((d, i) => (
                  <div key={i} className="flex justify-between" style={{ padding: '0.5rem', background: 'var(--card)', borderRadius: '0.25rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span>{d.date} | {d.startTime} - {d.endTime}</span>
                    <button type="button" onClick={() => removeDate(i)} style={{ color: '#ef4444' }}>Remover</button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <LinkIcon size={18} />
              {loading ? "Gerando..." : "Gerar Link de Escala"}
            </button>
          </form>

          {lastLink && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Link gerado com sucesso!</p>
              <div className="flex" style={{ wordBreak: 'break-all' }}>
                <code style={{ fontSize: '0.875rem', color: '#10b981' }}>{lastLink}</code>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="grid" style={{ gap: '1.5rem', alignContent: 'start' }}>
          <h3 style={{ marginBottom: '-0.5rem' }}>Escalas Recentes</h3>
          {schedules.map((s) => (
            <div key={s.id} className="card glass">
              <div className="flex justify-between" style={{ marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.125rem' }}>{s.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.ministry.name} - {s.sector.name}</p>
                </div>
                <div className="flex" style={{ gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(s)} style={{ color: 'var(--primary)' }}>
                    <Edit3 size={16} />
                  </button>
                  <div style={{ padding: '0.25rem 0.75rem', background: s.status === 'published' ? '#10b981' : 'var(--muted)', borderRadius: '1rem', fontSize: '0.75rem' }}>
                    {s.status === 'published' ? 'Publicada' : 'Rascunho'}
                  </div>
                  <button onClick={() => handleDelete(s.id)} style={{ color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex" style={{ gap: '0.5rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                <Calendar size={14} />
                {s.dates.length} datas selecionadas
              </div>
              <div className="flex" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  onClick={() => setManagingSchedule(s.id)}
                >
                  Ver Respostas
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/escala/${s.shareLink}`);
                    alert("Link copiado!");
                  }}
                >
                  <Copy size={16} style={{ marginRight: '0.5rem' }} />
                  Copiar Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {managingSchedule && (
        <ScheduleManager 
          scheduleId={managingSchedule} 
          onClose={() => {
            setManagingSchedule(null);
            getSchedules().then(sch => setSchedules(sch as unknown as Schedule[]));
          }} 
        />
      )}

      {editingSchedule && (
        <ScheduleEditor 
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={() => getSchedules().then(sch => setSchedules(sch as unknown as Schedule[]))}
        />
      )}
    </div>
  );
}
