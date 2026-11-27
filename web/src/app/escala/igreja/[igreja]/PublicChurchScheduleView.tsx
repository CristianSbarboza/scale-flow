"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Church,
  Clock,
  LogIn,
  MapPin,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/Providers";
import Button, { buttonClass } from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchInput from "@/components/ui/SearchInput";
import type { PublicViewAssignee } from "../../[link]/visualizar/PublicScheduleView";

export interface PublicChurchMinistryOption {
  id: number;
  name: string;
}

export interface PublicChurchSectorOption {
  id: number;
  name: string;
  ministryId: number;
}

export interface PublicChurchDateEntry {
  dateId: number;
  scheduleId: number;
  scheduleName: string;
  ministryId: number;
  ministryName: string;
  sectorId: number;
  sectorName: string;
  date: string;
  startTime: string;
  title: string | null;
  assignees: PublicViewAssignee[];
}

export interface PublicChurchScheduleData {
  churchName: string;
  churchUsername: string;
  ministries: PublicChurchMinistryOption[];
  sectors: PublicChurchSectorOption[];
  entries: PublicChurchDateEntry[];
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DEFAULT_SERVANT_COLOR = "#f97316";

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function PublicChurchScheduleView({
  data,
}: {
  data: PublicChurchScheduleData;
}) {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const loginHref = isAuthenticated
    ? session?.user.role === "servant"
      ? "/servant"
      : "/admin"
    : `/login?igreja=${encodeURIComponent(data.churchUsername)}`;

  // Abre no mês atual se houver datas nele; caso contrário, abre no mês mais
  // próximo a partir de hoje (ou no primeiro mês com datas).
  const initialDate = useMemo(() => {
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hasCurrentMonth = data.entries.some((e) => e.date.slice(0, 7) === currentPrefix);
    if (hasCurrentMonth || data.entries.length === 0) {
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const todayIso = now.toISOString().slice(0, 10);
    const upcoming = data.entries.find((e) => e.date.slice(0, 10) >= todayIso) ?? data.entries[0];
    const parsed = new Date(`${upcoming.date.slice(0, 10)}T00:00:00`);
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  }, [data.entries]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [filterMinistryId, setFilterMinistryId] = useState("all");
  const [filterSectorId, setFilterSectorId] = useState("all");
  const [highlightedServantId, setHighlightedServantId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedDay]);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const availableSectors = useMemo(
    () =>
      data.sectors.filter(
        (s) => filterMinistryId === "all" || s.ministryId === Number(filterMinistryId),
      ),
    [data.sectors, filterMinistryId],
  );

  // Entradas do mês selecionado já filtradas por ministério e setor.
  const monthEntriesByScope = useMemo(() => {
    return data.entries.filter((e) => {
      if (e.date.slice(0, 7) !== monthPrefix) return false;
      if (filterMinistryId !== "all" && e.ministryId !== Number(filterMinistryId)) {
        return false;
      }
      if (filterSectorId !== "all" && e.sectorId !== Number(filterSectorId)) {
        return false;
      }
      return true;
    });
  }, [data.entries, monthPrefix, filterMinistryId, filterSectorId]);

  // Todos os servos escalados neste mês (dentro do filtro de ministério/setor).
  const uniqueMonthAssignees = useMemo(() => {
    const map = new Map<number, PublicViewAssignee>();
    for (const entry of monthEntriesByScope) {
      for (const a of entry.assignees) {
        if (!map.has(a.servantId)) {
          map.set(a.servantId, a);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [monthEntriesByScope]);

  // Se o servo selecionado nos chips não estiver no novo mês/setor filtrado, limpa o destaque.
  const activeServantId = useMemo(() => {
    if (highlightedServantId === null) return null;
    return uniqueMonthAssignees.some((a) => a.servantId === highlightedServantId)
      ? highlightedServantId
      : null;
  }, [highlightedServantId, uniqueMonthAssignees]);

  // Agrupamento por dia (YYYY-MM-DD) para o calendário e o modal do dia.
  const entriesByDay = useMemo(() => {
    const map = new Map<string, PublicChurchDateEntry[]>();
    for (const entry of monthEntriesByScope) {
      const key = entry.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [monthEntriesByScope]);

  // Lista abaixo do calendário: aplica também o filtro de servo (chip) e a busca textual.
  const filteredMonthEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return monthEntriesByScope.filter((entry) => {
      if (
        activeServantId !== null &&
        !entry.assignees.some((a) => a.servantId === activeServantId)
      ) {
        return false;
      }
      if (!term) return true;
      const dateLabel = new Date(`${entry.date.slice(0, 10)}T00:00:00`)
        .toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })
        .toLowerCase();
      return (
        dateLabel.includes(term) ||
        entry.startTime.slice(0, 5).includes(term) ||
        entry.scheduleName.toLowerCase().includes(term) ||
        entry.ministryName.toLowerCase().includes(term) ||
        entry.sectorName.toLowerCase().includes(term) ||
        (entry.title?.toLowerCase().includes(term) ?? false) ||
        entry.assignees.some((a) => a.name.toLowerCase().includes(term))
      );
    });
  }, [monthEntriesByScope, activeServantId, searchTerm]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  const goToMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(null);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    const list = entriesByDay.get(selectedDay) ?? [];
    if (activeServantId === null) return list;
    return list.filter((e) => e.assignees.some((a) => a.servantId === activeServantId));
  }, [selectedDay, entriesByDay, activeServantId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho estilo Home do Servo em modo público */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: "7px", flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: "var(--font-logo)",
              fontWeight: 400,
              fontSize: "1.5rem",
              color: "var(--primary)",
              letterSpacing: "1px",
            }}
          >
            ScaleFlow
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            · {data.churchName}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            type="button"
            className="rounded-full p-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Link
            href={loginHref}
            className={buttonClass("primary", "px-3.5 py-2 text-xs sm:text-sm")}
          >
            <LogIn size={16} />
            <span>{isAuthenticated ? "Meu painel" : "Entrar no sistema"}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Identificação da Igreja + Filtros de Ministério, Setor e Servo */}
        <div className="card glass mb-6 animate-fade-in">
          <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {data.churchName}
          </p>
          <h1 className="mb-1 text-xl font-bold capitalize wrap-break-word sm:text-2xl">
            Escalas de {monthLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Programação geral de todos os ministérios e setores do mês.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              {monthEntriesByScope.length}{" "}
              {monthEntriesByScope.length === 1 ? "horário no mês" : "horários no mês"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-primary" />
              {uniqueMonthAssignees.length}{" "}
              {uniqueMonthAssignees.length === 1
                ? "servo escalado no mês"
                : "servos escalados no mês"}
            </span>
          </div>

          {/* Filtros de Ministério e Setor */}
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <FilterSelect
              label="Filtrar por ministério"
              value={filterMinistryId}
              onChange={(v) => {
                setFilterMinistryId(v);
                setFilterSectorId("all");
              }}
              options={[
                { value: "all", label: "Todos os Ministérios" },
                ...data.ministries.map((m) => ({ value: String(m.id), label: m.name })),
              ]}
            />
            <FilterSelect
              label="Filtrar por setor"
              value={filterSectorId}
              onChange={setFilterSectorId}
              options={[
                { value: "all", label: "Todos os Setores" },
                ...availableSectors.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
          </div>

          {/* Chips de filtro rápido por servo */}
          {uniqueMonthAssignees.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setHighlightedServantId(null)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    background: activeServantId === null ? "var(--primary)" : "var(--muted)",
                    borderColor: activeServantId === null ? "var(--primary)" : "var(--border)",
                    color:
                      activeServantId === null
                        ? "var(--primary-foreground)"
                        : "var(--muted-foreground)",
                  }}
                >
                  Todos ({uniqueMonthAssignees.length})
                </button>
                {uniqueMonthAssignees.map((servant) => {
                  const active = activeServantId === servant.servantId;
                  const dotColor = servant.color || DEFAULT_SERVANT_COLOR;
                  return (
                    <button
                      key={servant.servantId}
                      type="button"
                      onClick={() =>
                        setHighlightedServantId(active ? null : servant.servantId)
                      }
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        background: active ? dotColor : "var(--card)",
                        borderColor: active ? dotColor : "var(--card-border)",
                        color: active ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: active ? "currentColor" : dotColor,
                          flexShrink: 0,
                        }}
                      />
                      {servant.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 1. Calendário do Mês */}
        <section className="card glass mb-8 animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              className="p-2"
              onClick={() => goToMonth(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={20} />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
            <Button
              variant="ghost"
              className="p-2"
              onClick={() => goToMonth(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight size={20} />
            </Button>
          </div>

          <div className="servant-calendar-grid mx-auto max-w-[560px]">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="mb-2 text-center text-xs font-semibold text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const key = toDateKey(viewYear, viewMonth, day);
              const entries = entriesByDay.get(key);
              const hasScheduleDate = !!entries?.length;
              const allAssignees = entries?.flatMap((e) => e.assignees) ?? [];
              const hasConfirmed = allAssignees.length > 0;

              const highlightedAssignee =
                activeServantId !== null
                  ? allAssignees.find((a) => a.servantId === activeServantId)
                  : undefined;

              const isHighlighted =
                activeServantId !== null ? !!highlightedAssignee : hasConfirmed;

              const accentColor =
                (highlightedAssignee?.color ??
                  allAssignees.find((a) => a.color)?.color) ||
                DEFAULT_SERVANT_COLOR;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!hasScheduleDate}
                  onClick={() => setSelectedDay(key)}
                  className="servant-calendar-cell"
                  style={{
                    background: isHighlighted ? accentColor : "transparent",
                    borderColor: hasScheduleDate ? accentColor : "var(--foreground)",
                    color: isHighlighted
                      ? "var(--primary-foreground)"
                      : hasScheduleDate
                        ? accentColor
                        : "var(--foreground)",
                    fontWeight: hasScheduleDate ? 700 : 400,
                    cursor: hasScheduleDate ? "pointer" : "default",
                    opacity:
                      activeServantId !== null && hasScheduleDate && !isHighlighted
                        ? 0.45
                        : undefined,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Lista com todos os escalados do mês abaixo */}
        <section className="animate-fade-in">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Escalados do Mês</h2>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar servo, ministério, setor..."
              />
            </div>
          </div>

          {filteredMonthEntries.length === 0 ? (
            <div className="card glass py-12 text-center text-sm text-muted-foreground">
              Nenhuma programação encontrada em {monthLabel} para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMonthEntries.map((entry) => {
                const dateKey = entry.date.slice(0, 10);
                const parsedDate = new Date(`${dateKey}T00:00:00`);
                const formattedDate = parsedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div
                    key={entry.dateId}
                    onClick={() => setSelectedDay(dateKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDay(dateKey);
                      }
                    }}
                    className="card glass cursor-pointer transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold capitalize">
                            <CalendarDays size={16} className="shrink-0 text-primary" />
                            {formattedDate}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-primary">
                            <Clock size={12} />
                            {entry.startTime.slice(0, 5)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Church size={12} className="text-primary" />
                            {entry.ministryName} · {entry.sectorName}
                          </span>
                          <span>·</span>
                          <span>{entry.scheduleName}</span>
                        </div>

                        {entry.title && (
                          <p className="mt-1 text-sm font-semibold text-primary wrap-break-word">
                            {entry.title}
                          </p>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-muted-foreground">
                        {entry.assignees.length}{" "}
                        {entry.assignees.length === 1 ? "confirmado" : "confirmados"}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-border pt-3">
                      {entry.assignees.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhum servo confirmado para este horário ainda.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {entry.assignees.map((assignee) => {
                            const isSelectedServant =
                              activeServantId === assignee.servantId;
                            const dotColor = assignee.color || DEFAULT_SERVANT_COLOR;
                            return (
                              <div
                                key={assignee.servantId}
                                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                                style={{
                                  background: isSelectedServant
                                    ? "color-mix(in oklab, var(--primary) 15%, var(--card))"
                                    : "var(--muted)",
                                  borderColor: isSelectedServant
                                    ? "var(--primary)"
                                    : "var(--border)",
                                  fontWeight: isSelectedServant ? 700 : 500,
                                }}
                              >
                                <span
                                  style={{
                                    width: "9px",
                                    height: "9px",
                                    borderRadius: "50%",
                                    background: dotColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <span>{assignee.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de detalhes do dia */}
      {selectedDay &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="card glass flex max-h-[85dvh] w-full max-w-[420px] min-w-0 flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
                <h3 className="truncate text-base font-semibold">
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <CloseButton onClick={() => setSelectedDay(null)} />
              </div>

              <div className="-mr-3 grid min-h-0 flex-[1_1_auto] grid-cols-1 gap-3 overflow-y-auto pr-3">
                {selectedDayEntries.map((entry) => (
                  <div
                    key={entry.dateId}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "var(--muted)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>
                      {entry.scheduleName}
                    </p>
                    {entry.title && (
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: "var(--primary)",
                          marginBottom: "0.375rem",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {entry.title}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        fontSize: "0.8125rem",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Clock size={14} /> {entry.startTime.slice(0, 5)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.375rem",
                        fontSize: "0.8125rem",
                        color: "var(--muted-foreground)",
                        marginTop: "0.25rem",
                      }}
                    >
                      <MapPin size={14} style={{ marginTop: "0.125rem", flexShrink: 0 }} />
                      <div>
                        <p>{entry.ministryName}</p>
                        <p>{entry.sectorName}</p>
                      </div>
                    </div>

                    <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.375rem" }}>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: "var(--muted-foreground)",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Confirmados ({entry.assignees.length})
                      </p>
                      {entry.assignees.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhum servo confirmado neste horário.
                        </p>
                      ) : (
                        entry.assignees.map((assignee) => (
                          <div
                            key={assignee.servantId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem 0.625rem",
                              background: "var(--card)",
                              border: "1px solid var(--card-border)",
                              borderRadius: "var(--radius)",
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: assignee.color || DEFAULT_SERVANT_COLOR,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                              {assignee.name}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

