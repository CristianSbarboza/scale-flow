"use client";

import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import IconButton from "@/components/ui/IconButton";
import type { ScheduleDateInput } from "@/types/domain";

/** Mesmo limite que o servidor aplica em `tituloDaData`. */
export const DATE_TITLE_MAX = 80;

/**
 * Bloco de datas e horários dos formulários de escala: escolhe data, hora e,
 * se quiser, um título; adiciona à lista, remove da lista.
 *
 * Estava escrito à mão nos dois formulários que criam escala — o do admin e o
 * do coordenador — com a mesma grade 2fr/1fr/auto e o mesmo botão de calendário.
 *
 * O título continua editável na lista. Data e horário não: trocar um deles é
 * outra data, e o servidor casa as linhas por (dia, horário) — ver
 * `sincronizarDatas`.
 */
export default function ScheduleDatesField({
  value,
  onChange,
}: {
  value: ScheduleDateInput[];
  onChange: (dates: ScheduleDateInput[]) => void;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [title, setTitle] = useState("");

  const add = () => {
    if (!date) return;
    onChange([...value, { date, startTime, title: title.trim() || null }]);
    setDate("");
    setTitle("");
  };

  const renomear = (i: number, novo: string) =>
    onChange(value.map((d, idx) => (idx === i ? { ...d, title: novo } : d)));

  const formatar = (d: string) =>
    new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
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
        <input
          type="text"
          aria-label="Título da data"
          className="input col-span-3"
          placeholder="Título (opcional) — ex: Culto de Santa Ceia"
          maxLength={DATE_TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // Enter aqui submeteria o formulário da escala inteira.
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
        />
      </div>

      <div className="mt-4 grid gap-2">
        {value.map((d, i) => (
          <div
            key={`${d.date}-${d.startTime}-${i}`}
            className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm"
          >
            <span className="shrink-0">
              {formatar(d.date)} · {d.startTime.slice(0, 5)}
            </span>
            <input
              type="text"
              aria-label="Título da data"
              className="input min-w-0 flex-1 py-1 text-sm"
              placeholder="Sem título"
              maxLength={DATE_TITLE_MAX}
              value={d.title ?? ""}
              onChange={(e) => renomear(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            />
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
