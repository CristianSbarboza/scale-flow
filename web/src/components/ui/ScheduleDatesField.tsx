"use client";

import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import IconButton from "@/components/ui/IconButton";

export interface ScheduleDateEntry {
  date: string;
  startTime: string;
}

/**
 * Bloco de datas e horários dos formulários de escala: escolhe data e hora,
 * adiciona à lista, remove da lista.
 *
 * Estava escrito à mão nos dois formulários que criam escala — o do admin e o
 * do coordenador — com a mesma grade 2fr/1fr/auto e o mesmo botão de calendário.
 */
export default function ScheduleDatesField({
  value,
  onChange,
}: {
  value: ScheduleDateEntry[];
  onChange: (dates: ScheduleDateEntry[]) => void;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");

  const add = () => {
    if (!date) return;
    onChange([...value, { date, startTime }]);
    setDate("");
  };

  const formatar = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      weekday: "short",
    });

  return (
    <div className="rounded-lg bg-muted p-4">
      <h4 className="mb-4 text-sm">Adicionar Datas e Horários</h4>

      <div className="grid grid-cols-[2fr_1fr_auto] gap-2">
        <input
          type="date"
          aria-label="Data"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          aria-label="Horário"
          className="input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Button onClick={add} aria-label="Adicionar data" className="p-2">
          <CalendarPlus size={20} />
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        {value.map((d, i) => (
          <div
            key={`${d.date}-${d.startTime}-${i}`}
            className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm"
          >
            <span>
              {formatar(d.date)} · {d.startTime.slice(0, 5)}
            </span>
            <IconButton
              label="Remover data"
              tone="destructive"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
        {value.length === 0 && (
          <EmptyState className="p-4">Nenhuma data adicionada ainda.</EmptyState>
        )}
      </div>
    </div>
  );
}
