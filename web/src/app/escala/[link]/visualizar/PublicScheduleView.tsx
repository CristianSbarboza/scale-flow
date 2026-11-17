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
import SearchInput from "@/components/ui/SearchInput";

export interface PublicViewAssignee {
  servantId: number;
  name: string;
  color: string | null;
}

export interface PublicViewDate {
  id: number;
  date: string;
  startTime: string;
  title: string | null;
  assignees: PublicViewAssignee[];
}

export interface PublicScheduleViewData {
  id: number;
  name: string;
  churchName: string;
  churchUsername: string;
  ministryName: string;
  sectorName: string;
  dates: PublicViewDate[];
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function PublicScheduleView({
  schedule,
}: {
  schedule: PublicScheduleViewData;
}) {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const loginHref = isAuthenticated
    ? session?.user.role === "servant"
      ? "/servant"
      : "/admin"
    : `/login?igreja=${encodeURIComponent(schedule.churchUsername)}`;

  // Abre direto no mês da escala: se o mês atual tiver datas nesta escala, usa
  // o mês atual; caso contrário, abre no mês da primeira data da escala.
  const initialDate = useMemo(() => {
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hasCurrentMonth = schedule.dates.some((d) => d.date.slice(0, 7) === currentPrefix);
    if (hasCurrentMonth || schedule.dates.length === 0) {
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const first = new Date(`${schedule.dates[0].date.slice(0, 10)}T00:00:00`);
    return { year: first.getFullYear(), month: first.getMonth() };
  }, [schedule.dates]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedServantId, setHighlightedServantId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedDay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedDay]);

  // Lista única de todos os servos escalados nesta escala, ordenada por nome.
  const uniqueAssignees = useMemo(() => {
    const map = new Map<number, PublicViewAssignee>();
    for (const d of schedule.dates) {
      for (const a of d.assignees) {
        if (!map.has(a.servantId)) {
          map.set(a.servantId, a);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [schedule.dates]);

  // Agrupamento por dia (YYYY-MM-DD) para o calendário e o modal do dia.
  const datesByDay = useMemo(() => {
    const map = new Map<string, PublicViewDate[]>();
    for (const d of schedule.dates) {
      const key = d.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), d]);
    }
    return map;
  }, [schedule.dates]);

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
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const filteredDates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return schedule.dates.filter((d) => {
      if (
        highlightedServantId !== null &&
        !d.assignees.some((a) => a.servantId === highlightedServantId)
      ) {
        return false;
      }
      if (!term) return true;
      const dateLabel = new Date(`${d.date.slice(0, 10)}T00:00:00`)
        .toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })
        .toLowerCase();
      return (
        dateLabel.includes(term) ||
        d.startTime.slice(0, 5).includes(term) ||
        (d.title?.toLowerCase().includes(term) ?? false) ||
        d.assignees.some((a) => a.name.toLowerCase().includes(term))
      );
    });
  }, [schedule.dates, highlightedServantId, searchTerm]);

  const selectedEntries = selectedDay ? datesByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho no mesmo estilo da home do servo, em modo público de leitura */}
      <header
        className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6"
      >
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
            · {schedule.churchName}
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
        {/* Identificação da Escala */}
        <div className="card glass mb-6 animate-fade-in">
          <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {schedule.churchName}
          </p>
          <h1 className="mb-1 text-xl font-bold wrap-break-word sm:text-2xl">
            {schedule.name}
          </h1>
          <p className="text-sm font-semibold text-primary wrap-break-word">
            {schedule.ministryName} · {schedule.sectorName}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              {schedule.dates.length} {schedule.dates.length === 1 ? "data" : "datas"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-primary" />
              {uniqueAssignees.length}{" "}
              {uniqueAssignees.length === 1 ? "servo escalado" : "servos escalados"}
            </span>
          </div>

          {uniqueAssignees.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs text-muted-foreground">
                Toque no seu nome para destacar seus dias no calendário e filtrar a lista:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setHighlightedServantId(null)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    background:
                      highlightedServantId === null ? "var(--primary)" : "var(--muted)",
                    borderColor:
                      highlightedServantId === null ? "var(--primary)" : "var(--border)",
                    color:
                      highlightedServantId === null
                        ? "var(--primary-foreground)"
                        : "var(--muted-foreground)",
                  }}
                >
                  Todos ({uniqueAssignees.length})
                </button>
                {uniqueAssignees.map((servant) => {
                  const active = highlightedServantId === servant.servantId;
                  const dotColor = servant.color || "var(--primary)";
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

        {/* 1. Calendário no estilo da Home do Servo */}
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
              const entries = datesByDay.get(key);
              const hasScheduleDate = !!entries?.length;
              const allAssignees = entries?.flatMap((e) => e.assignees) ?? [];
              const hasConfirmed = allAssignees.length > 0;

              const highlightedAssignee =
                highlightedServantId !== null
                  ? allAssignees.find((a) => a.servantId === highlightedServantId)
                  : undefined;

              const isHighlighted =
                highlightedServantId !== null ? !!highlightedAssignee : hasConfirmed;

              const accentColor =
                (highlightedAssignee?.color ?? allAssignees[0]?.color) || "var(--primary)";

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
                      highlightedServantId !== null && hasScheduleDate && !isHighlighted
                        ? 0.45
                        : undefined,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Toque em um dia destacado no calendário para ver os horários e quem está escalado.
          </p>
        </section>

        {/* 2. Lista com todos os escalados abaixo */}
        <section className="animate-fade-in">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Todos os Escalados</h2>
              <p className="text-xs text-muted-foreground">
                Confira a programação completa de datas, horários e servos confirmados.
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar servo, data ou culto..."
              />
            </div>
          </div>

          {filteredDates.length === 0 ? (
            <div className="card glass py-12 text-center text-sm text-muted-foreground">
              Nenhuma data encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDates.map((d) => {
                const dateKey = d.date.slice(0, 10);
                const parsedDate = new Date(`${dateKey}T00:00:00`);
                const formattedDate = parsedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div
                    key={d.id}
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
                            {d.startTime.slice(0, 5)}
                          </span>
                        </div>
                        {d.title && (
                          <p className="mt-1 text-sm font-semibold text-primary wrap-break-word">
                            {d.title}
                          </p>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-muted-foreground">
                        {d.assignees.length}{" "}
                        {d.assignees.length === 1 ? "confirmado" : "confirmados"}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-border pt-3">
                      {d.assignees.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhum servo confirmado para este horário ainda.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {d.assignees.map((assignee) => {
                            const isSelectedServant =
                              highlightedServantId === assignee.servantId;
                            const dotColor = assignee.color || "var(--primary)";
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

      {/* Modal de detalhes do dia (mesmo padrão do ServantCalendar, somente leitura) */}
      {selectedDay &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="card glass flex max-h-[85dvh] w-full max-w-[380px] min-w-0 flex-col overflow-hidden"
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
                {selectedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "var(--muted)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>
                      {schedule.name}
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
                        <p>{schedule.ministryName}</p>
                        <p>{schedule.sectorName}</p>
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
                                background: assignee.color || "var(--primary)",
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

