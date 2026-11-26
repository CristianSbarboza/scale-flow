"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MapPin, Repeat, Check } from "lucide-react";
import type { ServantOverviewSchedule, ServantOverviewAssignee } from "@/types/domain";
import { createSwapRequest } from "@/lib/actions/swaps";
import DataPanel from "@/components/ui/DataPanel";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";

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
  title: string | null;
  requesterServantId: number;
  assignees: ServantOverviewAssignee[];
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
/** Cor padrão ("Padrão" em PanelStyleSection) de quem não escolheu cor personalizada. */
const DEFAULT_SERVANT_COLOR = "#f97316";

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ServantCalendar({ schedules }: ServantCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthDir, setMonthDir] = useState<1 | -1>(1);
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
          title: date.title,
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
  // Sempre 6 linhas, igual ao calendario do admin: a altura nao muda ao
  // trocar de mes.
  while (cells.length < 42) cells.push(null);

  const goToMonth = (offset: number) => {
    setMonthDir(offset >= 0 ? 1 : -1);
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
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="card glass overflow-hidden">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" className="p-2" onClick={() => goToMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft size={20} />
            </Button>
            <AnimatePresence mode="wait" custom={monthDir}>
              <motion.h3
                key={`${viewYear}-${viewMonth}-label`}
                initial={{ opacity: 0, x: monthDir * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: monthDir * -16 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="capitalize"
              >
                {monthLabel}
              </motion.h3>
            </AnimatePresence>
            <Button variant="ghost" className="p-2" onClick={() => goToMonth(1)} aria-label="Próximo mês">
              <ChevronRight size={20} />
            </Button>
          </div>

          <AnimatePresence mode="wait" custom={monthDir}>
            <motion.div
              key={`${viewYear}-${viewMonth}-grid`}
              initial={{ opacity: 0, x: monthDir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: monthDir * -24 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="servant-calendar-grid mx-auto max-w-[560px]"
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="mb-2 text-center text-xs font-semibold text-muted-foreground">
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
                const otherAssignee =
                  allAssignees.find((a) => !a.isSelf && a.color) ??
                  allAssignees.find((a) => !a.isSelf);
                const isSelfConfirmed = !!selfAssignee;
                const accentColor = isSelfConfirmed
                  ? selfAssignee?.color || "var(--primary)"
                  : otherAssignee?.color || DEFAULT_SERVANT_COLOR;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isConfirmed}
                    onClick={() => setSelectedDay(key)}
                    className="servant-calendar-cell transition-transform duration-150 active:scale-90"
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
            </motion.div>
          </AnimatePresence>
        </div>

        <DataPanel
          title="Seus dias"
          rows={monthEntries}
          rowKey={(e) => `${e.dateId}-${e.date}`}
          empty="Nenhum dia confirmado neste mês."
          onRowClick={(e) => setSelectedDay(e.date)}
          style={{ background: "none", border: "none", boxShadow: "none", backdropFilter: "none" }}
          columns={[
            {
              header: "Dia",
              primary: true,
              mobileRow: 1,
              cell: (e) => (
                <span className="font-bold text-primary">
                  {new Date(`${e.date}T00:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              ),
            },
            {
              header: "Horário",
              primary: true,
              mobileRow: 1,
              cell: (e) => (
                <span>
                  <span className="font-bold text-primary">{e.startTime.slice(0, 5)}</span>
                  {e.title && <span className="block text-xs text-muted-foreground">{e.title}</span>}
                </span>
              ),
            },
            { header: "Ministério", mobileRow: 2, cell: (e) => e.ministryName },
            { header: "Setor", mobileRow: 2, cell: (e) => e.sectorName },
          ]}
        />
      </div>

      {selectedDay && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setSelectedDay(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="card glass"
            style={{ width: "100%", maxWidth: "360px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexShrink: 0 }}>
              <h3>
                {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <CloseButton onClick={() => setSelectedDay(null)} />
            </div>
            <div className="-mr-3 grid min-h-0 flex-[1_1_auto] gap-3 overflow-y-auto pr-3">
              {selectedEntries.map((entry, i) => (
                <div key={i} style={{ padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                  <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>{entry.scheduleName}</p>
                  {entry.title && (
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.375rem", overflowWrap: "anywhere" }}>{entry.title}</p>
                  )}
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
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background:
                                  assignee.color ||
                                  (assignee.isSelf ? "var(--primary)" : DEFAULT_SERVANT_COLOR),
                                flexShrink: 0,
                              }}
                            />
                            {assignee.name}
                            {assignee.isSelf && " (você)"}
                          </span>
                          {assignee.isSelf ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "var(--success)" }}>
                              <Check size={12} /> Você
                            </span>
                          ) : (
                            <Button variant="secondary" type="button"
                              onClick={() => handleNegotiate(entry, assignee)}
                              disabled={isLoading}
                              
                              style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem", flexShrink: 0 }}>
                              <Repeat size={13} />
                              {isLoading ? "Enviando..." : "Negociar"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
