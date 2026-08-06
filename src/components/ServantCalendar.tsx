"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, MapPin, X, Repeat, Check } from "lucide-react";
import type { ServantOverviewSchedule, ServantOverviewAssignee } from "@/lib/actions";
import { createSwapRequest } from "@/lib/actions";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface ServantCalendarProps {
  schedules: ServantOverviewSchedule[];
}

interface DayEntry {
  dateId: number;
  date: string;
  scheduleName: string;
  ministryName: string;
  sectorName: string;
  startTime: string;
  requesterServantId: number;
  assignees: ServantOverviewAssignee[];
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ServantCalendar({ schedules }: ServantCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [negotiating, setNegotiating] = useState<string | null>(null);
  const { showToast } = useToast();
  const askConfirm = useConfirm();

  const confirmedByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const schedule of schedules) {
      for (const date of schedule.dates) {
        if (date.assignees.length === 0) continue;
        const key = date.date.slice(0, 10);
        const entry: DayEntry = {
          dateId: date.id,
          date: key,
          scheduleName: schedule.name,
          ministryName: schedule.ministryName,
          sectorName: schedule.sectorName,
          startTime: date.startTime,
          requesterServantId: schedule.servantId,
          assignees: date.assignees,
        };
        map.set(key, [...(map.get(key) ?? []), entry]);
      }
    }
    return map;
  }, [schedules]);

  // Só os dias em que o próprio servo está confirmado (agenda pessoal).
  const monthEntries = useMemo(() => {
    const entries: DayEntry[] = [];
    for (const dayEntries of confirmedByDay.values()) {
      for (const entry of dayEntries) {
        if (!entry.assignees.some((a) => a.isSelf)) continue;
        const parsed = new Date(`${entry.date}T00:00:00`);
        if (parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth) {
          entries.push(entry);
        }
      }
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [confirmedByDay, viewYear, viewMonth]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goToMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const selectedEntries = selectedDay ? confirmedByDay.get(selectedDay) ?? [] : [];

  const handleNegotiate = async (entry: DayEntry, target: ServantOverviewAssignee) => {
    const dayLabel = new Date(`${entry.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const ok = await askConfirm({
      title: "Negociar troca de dia",
      message: `Enviar pedido para ${target.name} liberar o dia ${dayLabel} (${entry.startTime.slice(0, 5)}) para você assumir?`,
      confirmLabel: "Enviar pedido",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    const key = `${entry.dateId}-${target.servantId}`;
    setNegotiating(key);
    try {
      await createSwapRequest(entry.dateId, target.servantId, entry.requesterServantId);
      showToast(`Pedido enviado para ${target.name}.`, "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao enviar pedido.", "error");
    } finally {
      setNegotiating(null);
    }
  };

  return (
    <div>
      <div className="servant-calendar-layout">
        <div style={{ maxWidth: "810px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <button onClick={() => goToMonth(-1)} className="btn btn-ghost" style={{ padding: "0.5rem" }} aria-label="Mês anterior">
              <ChevronLeft size={20} />
            </button>
            <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
            <button onClick={() => goToMonth(1)} className="btn btn-ghost" style={{ padding: "0.5rem" }} aria-label="Próximo mês">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="servant-calendar-grid">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                {label}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const key = toDateKey(viewYear, viewMonth, day);
              const entries = confirmedByDay.get(key);
              const isConfirmed = !!entries?.length;
              const allAssignees = entries?.flatMap((e) => e.assignees) ?? [];
              const selfAssignee = allAssignees.find((a) => a.isSelf);
              const otherAssignee = allAssignees.find((a) => !a.isSelf);
              const isSelfConfirmed = !!selfAssignee;
              const accentColor = (isSelfConfirmed ? selfAssignee?.color : otherAssignee?.color) || "var(--primary)";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isConfirmed}
                  onClick={() => setSelectedDay(key)}
                  className="servant-calendar-cell"
                  style={{
                    background: isSelfConfirmed ? accentColor : "transparent",
                    borderColor: isConfirmed ? accentColor : "var(--foreground)",
                    color: isSelfConfirmed ? "var(--primary-foreground)" : isConfirmed ? accentColor : "var(--foreground)",
                    fontWeight: isConfirmed ? 700 : 400,
                    cursor: isConfirmed ? "pointer" : "default",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.5rem", alignContent: "start" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Seus dias</h3>
        {monthEntries.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", padding: "1.5rem 0" }}>
            Nenhum dia confirmado neste mês.
          </p>
        ) : (
          monthEntries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.75rem 1rem",
                background: "var(--muted)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{entry.startTime.slice(0, 5)}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{entry.ministryName}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{entry.sectorName}</p>
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {selectedDay && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="card glass"
            style={{ width: "100%", maxWidth: "360px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexShrink: 0 }}>
              <h3>
                {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gap: "0.75rem", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
              {selectedEntries.map((entry, i) => (
                <div key={i} style={{ padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                  <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>{entry.scheduleName}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                    <Clock size={14} /> {entry.startTime.slice(0, 5)}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    <MapPin size={14} style={{ marginTop: "0.125rem", flexShrink: 0 }} />
                    <div>
                      <p>{entry.ministryName}</p>
                      <p>{entry.sectorName}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.375rem" }}>
                    <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Confirmados
                    </p>
                    {entry.assignees.map((assignee) => {
                      const key = `${entry.dateId}-${assignee.servantId}`;
                      const isLoading = negotiating === key;
                      return (
                        <div
                          key={assignee.servantId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                            padding: "0.5rem 0.625rem",
                            background: "var(--card)",
                            border: "1px solid var(--card-border)",
                            borderRadius: "var(--radius)",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: assignee.isSelf ? 700 : 500 }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: assignee.color || "var(--primary)", flexShrink: 0 }} />
                            {assignee.name}
                            {assignee.isSelf && " (você)"}
                          </span>
                          {assignee.isSelf ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "#10b981" }}>
                              <Check size={12} /> Você
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleNegotiate(entry, assignee)}
                              disabled={isLoading}
                              className="btn btn-secondary"
                              style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem", flexShrink: 0 }}
                            >
                              <Repeat size={13} />
                              {isLoading ? "Enviando..." : "Negociar"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
