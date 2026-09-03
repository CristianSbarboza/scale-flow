"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Send, Lock } from "lucide-react";
import { saveAvailability } from "@/lib/actions/availability";
import SelectField from "@/components/ui/SelectField";
import Button, { buttonClass } from "@/components/ui/Button";

interface AvailabilityFormProps {
  scheduleId: number;
  dates: Array<{
    id: number;
    date: string;
    startTime: string;
  }>;
  servants: Array<{
    id: number;
    user: { name: string };
  }>;
  initialServantId?: string;
  /** Escala privada: o servo já está identificado pela sessão, não há o que escolher. */
  lockedServantName?: string;
  /**
   * Servo da sessão. Só as respostas dele vêm marcadas, e só o envio dele
   * substitui o que havia — a mesma condição que `saveAvailability` aplica.
   */
  editableServantId?: number;
  /** Datas que esse servo já tinha enviado. */
  initialDates: number[];
  returnToServant?: boolean;
}

export default function AvailabilityForm({ scheduleId, dates, servants, initialServantId, lockedServantName, editableServantId, initialDates, returnToServant }: AvailabilityFormProps) {
  const validInitialServantId = servants.some((s) => String(s.id) === initialServantId) ? initialServantId! : "";
  const ehOServoDaSessao = (id: string) => editableServantId !== undefined && id === String(editableServantId);
  const [selectedServant, setSelectedServant] = useState(validInitialServantId);
  const [selectedDates, setSelectedDates] = useState<number[]>(
    ehOServoDaSessao(validInitialServantId) ? initialDates : [],
  );
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const editando = ehOServoDaSessao(selectedServant);
  /** Já havia resposta: a tela é uma correção, não um primeiro envio. */
  const corrigindo = editando && initialDates.length > 0;

  // Trocar de nome na lista pública troca de quem são as respostas: as do servo
  // da sessão vêm marcadas, as de qualquer outro nome não são nossas para mostrar.
  const handleServantChange = (id: string) => {
    setSelectedServant(id);
    setSelectedDates(ehOServoDaSessao(id) ? initialDates : []);
  };

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
    // Zero datas só faz sentido para quem está corrigindo o que já enviou:
    // é assim que o servo avisa que não pode em nenhum dia. Num primeiro
    // envio em branco não há nada a gravar, e o pedido é engano.
    if (selectedDates.length === 0 && !editando) return alert("Selecione ao menos uma data");

    setLoading(true);
    try {
      await saveAvailability(parseInt(selectedServant), scheduleId, selectedDates);
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
        <p style={{ color: 'var(--muted-foreground)' }}>
          {corrigindo
            ? "Sua disponibilidade foi atualizada. Vale a que está aqui agora."
            : "Sua disponibilidade foi enviada com sucesso ao administrador."}
        </p>
        {returnToServant && (
          <Link href="/servant" className={buttonClass("primary")} style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
            Voltar ao meu painel
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" style={{ gap: '1.5rem' }}>
      <div className="card glass">
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Quem é você?</label>
        {lockedServantName ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
            <Lock size={15} />
            {lockedServantName}
          </p>
        ) : (
          <SelectField
            label="Quem é você?"
            hideLabel
            value={selectedServant}
            onChange={handleServantChange}
            placeholder="Selecione seu nome"
            options={servants.map((s) => ({ value: s.id, label: s.user.name }))}
            required
          />
        )}
      </div>

      {corrigindo && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '-0.75rem' }}>
          Suas respostas anteriores já vêm marcadas. Vale exatamente o que ficar
          marcado ao salvar — desmarcar remove a data.
        </p>
      )}

      <div className="grid gap-6" style={{ gap: '0.75rem' }}>
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
                background: 'var(--muted)',
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
                <p style={{ fontWeight: 600 }}>{new Date(`${d.date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{d.startTime.slice(0, 5)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="primary" type="submit"  style={{ width: '100%', padding: '1rem' }} disabled={loading}>
        {loading ? "Enviando..." : (
          <>
            <Send size={18} />
            {corrigindo ? "Salvar alterações" : "Confirmar Disponibilidade"}
          </>
        )}
      </Button>
    </form>
  );
}
