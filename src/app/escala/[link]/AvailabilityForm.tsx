"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { saveAvailability } from "@/lib/actions";

interface AvailabilityFormProps {
  dates: Array<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  servants: Array<{
    id: number;
    user: { name: string };
  }>;
}

export default function AvailabilityForm({ dates, servants }: AvailabilityFormProps) {
  const [selectedServant, setSelectedServant] = useState("");
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleDate = (dateId: number) => {
    if (selectedDates.includes(dateId)) {
      setSelectedDates(selectedDates.filter(id => id !== dateId));
    } else {
      setSelectedDates([...selectedDates, dateId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServant) return alert("Selecione seu nome");
    if (selectedDates.length === 0) return alert("Selecione ao menos uma data");

    setLoading(true);
    try {
      await saveAvailability(parseInt(selectedServant), selectedDates);
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar disponibilidade.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card glass animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          background: '#10b981', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <Check size={32} color="white" />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Obrigado!</h2>
        <p style={{ color: 'var(--muted-foreground)' }}>Sua disponibilidade foi enviada com sucesso ao administrador.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid" style={{ gap: '1.5rem' }}>
      <div className="card glass">
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Quem é você?</label>
        <select 
          className="input" 
          value={selectedServant} 
          onChange={e => setSelectedServant(e.target.value)}
          required
        >
          <option value="">Selecione seu nome</option>
          {servants.map((s) => (
            <option key={s.id} value={s.id}>{s.user.name}</option>
          ))}
        </select>
      </div>

      <div className="grid" style={{ gap: '0.75rem' }}>
        {dates.map((d) => {
          const isSelected = selectedDates.includes(d.id);
          return (
            <div 
              key={d.id} 
              onClick={() => toggleDate(d.id)}
              className="card glass" 
              style={{ 
                cursor: 'pointer', 
                border: 'none',
                borderBottom: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                background: 'rgba(30, 41, 59, 0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '0'
              }}
            >
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '6px', 
                border: '2px solid var(--primary)',
                background: isSelected ? 'var(--primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isSelected && <Check size={16} color="white" />}
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{d.startTime} até {d.endTime}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={loading}>
        {loading ? "Enviando..." : (
          <>
            <Send size={18} />
            Confirmar Disponibilidade
          </>
        )}
      </button>
    </form>
  );
}
