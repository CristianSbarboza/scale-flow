"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, X, Clock, Users, Church } from "lucide-react";
import { getCalendarSchedules } from "@/lib/actions/schedules";
import FilterSelect from "@/components/ui/FilterSelect";
import DataPanel from "@/components/ui/DataPanel";
import LoadingDots from "@/components/ui/LoadingDots";
import { getSectors } from "@/lib/actions/sectors";
import { getMinistries } from "@/lib/actions/ministries";
import type { CalendarSchedule } from "@/types/domain";

interface Ministry {
  id: number;
  name: string;
}

interface Sector {
  id: number;
  name: string;
  ministryId: number;
}

interface DayEntry {
  scheduleId: number;
  dateId: number;
  ministryName: string;
  sectorName: string;
  scheduleName: string;
  startTime: string;
  assignees: { servantId: number; name: string }[];
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AdminCalendarPage() {
  const { data: session } = useSession();
  const isLeader = session?.user.role === "leader";

  const [schedules, setSchedules] = useState<CalendarSchedule[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getCalendarSchedules(), getMinistries(), getSectors()]).then(([cal, min, sec]) => {
      if (!isMounted) return;
      setSchedules(cal);
      setMinistries(min as unknown as Ministry[]);
      setSectors(sec as unknown as Sector[]);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesMinistry = filterMinistryId === "all" || s.ministryId === parseInt(filterMinistryId);
      const matchesSector = filterSectorId === "all" || s.sectorId === parseInt(filterSectorId);
      return matchesMinistry && matchesSector;
    });
  }, [schedules, filterMinistryId, filterSectorId]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const schedule of filteredSchedules) {
      for (const date of schedule.dates) {
        if (date.assignees.length === 0) continue;
        const key = date.date.slice(0, 10);
        const entry: DayEntry = {
          scheduleId: schedule.id,
          dateId: date.id,
          ministryName: schedule.ministryName,
          sectorName: schedule.sectorName,
          scheduleName: schedule.name,
          startTime: date.startTime,
          assignees: date.assignees,
        };
        map.set(key, [...(map.get(key) ?? []), entry]);
      }
    }
    return map;
  }, [filteredSchedules]);

  // Escalas com pelo menos uma data no mês em exibição, ja passadas pelos
  // mesmos filtros do calendario.
  const monthSchedules = useMemo(() => {
    const prefixo = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return filteredSchedules
      .map((s) => ({ ...s, monthDates: s.dates.filter((d) => d.date.slice(0, 7) === prefixo) }))
      .filter((s) => s.monthDates.length > 0);
  }, [filteredSchedules, viewYear, viewMonth]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Sempre 6 linhas: e o maximo que um mes ocupa (agosto/2026, por exemplo).
  // Assim a altura do calendario nao muda ao trocar de mes.
  while (cells.length < 42) cells.push(null);

  const goToMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const groupedBySelectedMinistry = useMemo(() => {
    const groups = new Map<string, DayEntry[]>();
    const entries = selectedDay ? entriesByDay.get(selectedDay) ?? [] : [];
    for (const entry of entries) {
      groups.set(entry.ministryName, [...(groups.get(entry.ministryName) ?? []), entry]);
    }
    return groups;
  }, [selectedDay, entriesByDay]);

  const availableSectors = sectors.filter((s) => filterMinistryId === "all" || s.ministryId === parseInt(filterMinistryId));

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Calendário</h1>
        <p style={{ color: "var(--muted-foreground)" }}>Veja quem está escalado em cada dia, por ministério.</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!isLeader && (
          <FilterSelect
            label="Filtrar por ministério"
            className="max-w-[220px]"
            value={filterMinistryId}
            onChange={(v) => {
              setFilterMinistryId(v);
              setFilterSectorId("all");
            }}
            options={[
              { value: "all", label: "Todos os Ministérios" },
              ...ministries.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
        )}
        <FilterSelect
          label="Filtrar por setor"
          className="max-w-[220px]"
          value={filterSectorId}
          onChange={setFilterSectorId}
          options={[
            { value: "all", label: "Todos os Setores" },
            ...availableSectors.map((sec) => ({ value: String(sec.id), label: sec.name })),
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="card glass">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => goToMonth(-1)} className="btn btn-ghost p-2" aria-label="Mês anterior">
            <ChevronLeft size={20} />
          </button>
          <h3 className="capitalize">{monthLabel}</h3>
          <button onClick={() => goToMonth(1)} className="btn btn-ghost p-2" aria-label="Próximo mês">
            <ChevronRight size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <LoadingDots label="Carregando calendário" />
          </div>
        ) : (
          <div className="servant-calendar-grid mx-auto max-w-[560px]">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                {label}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const key = toDateKey(viewYear, viewMonth, day);
              const entries = entriesByDay.get(key);
              const isConfirmed = !!entries?.length;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isConfirmed}
                  onClick={() => setSelectedDay(key)}
                  className="servant-calendar-cell"
                  style={{
                    background: "transparent",
                    borderColor: isConfirmed ? "var(--primary)" : "var(--foreground)",
                    color: isConfirmed ? "var(--primary)" : "var(--foreground)",
                    fontWeight: isConfirmed ? 700 : 400,
                    cursor: isConfirmed ? "pointer" : "default",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
        </div>

        <DataPanel
          title="Escalas do Mês"
          rows={monthSchedules}
          loading={loading}
          rowKey={(s) => s.id}
          empty="Nenhuma escala neste mês."
          columns={[
            { header: "Escala", primary: true, cell: (s) => s.name },
            { header: "Setor", cell: (s) => s.sectorName },
            {
              header: "Datas",
              cell: (s) => s.monthDates.length,
            },
            {
              header: "Escalados",
              cell: (s) =>
                new Set(s.monthDates.flatMap((d) => d.assignees.map((a) => a.servantId))).size,
            },
          ]}
        />
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="card glass"
            style={{ width: "100%", maxWidth: "440px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
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

            <div style={{ display: "grid", gap: "1.25rem", overflowY: "auto" }}>
              {groupedBySelectedMinistry.size === 0 && (
                <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", padding: "1.5rem 0" }}>
                  Ninguém escalado neste dia.
                </p>
              )}
              {Array.from(groupedBySelectedMinistry.entries()).map(([ministryName, entries]) => (
                <div key={ministryName}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <Church size={14} color="var(--primary)" />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {ministryName}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {entries.map((entry, i) => (
                      <div key={i} style={{ padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{entry.scheduleName}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            <Clock size={12} /> {entry.startTime.slice(0, 5)}
                          </div>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>{entry.sectorName}</p>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                          <Users size={14} color="var(--primary)" style={{ marginTop: "0.125rem", flexShrink: 0 }} />
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                            {entry.assignees.map((a) => (
                              <span
                                key={a.servantId}
                                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "1rem" }}
                              >
                                {a.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
