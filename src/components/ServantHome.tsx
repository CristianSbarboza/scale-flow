"use client";

import { CalendarDays, CalendarRange, CalendarPlus, ListChecks, ClipboardList } from "lucide-react";
import type { ServantOverviewSchedule, CoordinatorSector } from "@/types/domain";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";
import CoordinatorSchedulePanel from "@/components/CoordinatorSchedulePanel";
import PageHeader from "@/components/ui/PageHeader";

export type ServantTab = "calendar" | "next" | "month" | "all" | "coordinator";

export interface ServantTabItem {
  value: ServantTab;
  /** Texto curto da tab bar do celular e da sidebar. */
  label: string;
  icon: typeof CalendarDays;
  /** Linha de apoio do cabeçalho no desktop, onde a tab bar não aparece. */
  subtitle: string;
}

const BASE_TABS: ServantTabItem[] = [
  {
    value: "calendar",
    label: "Calendário",
    icon: CalendarDays,
    subtitle: "Suas escalas do mês em formato de calendário.",
  },
  {
    value: "month",
    label: "Atual",
    icon: CalendarRange,
    subtitle: "As escalas do seu setor com datas neste mês.",
  },
  {
    value: "next",
    label: "Próxima",
    icon: CalendarPlus,
    subtitle: "Escalas do seu setor já abertas para o mês que vem.",
  },
  {
    value: "all",
    label: "Todas",
    icon: ListChecks,
    subtitle: "Todas as escalas do seu setor.",
  },
];

const COORDINATOR_TAB: ServantTabItem = {
  value: "coordinator",
  label: "Gestão",
  icon: ClipboardList,
  subtitle: "Gerencie as escalas dos setores que você coordena.",
};

export function getServantTabs(isCoordinator: boolean): ServantTabItem[] {
  return isCoordinator ? [...BASE_TABS, COORDINATOR_TAB] : BASE_TABS;
}

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  tab: ServantTab;
  onTabChange: (tab: ServantTab) => void;
}

export default function ServantHome({ schedules, coordinatorSectors, tab, onTabChange }: ServantHomeProps) {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const isCoordinator = coordinatorSectors.length > 0;
  const tabs = getServantTabs(isCoordinator);
  const current = tabs.find((t) => t.value === tab);

  return (
    <div className="servant-tab-content">
      {/* No celular a tab bar já diz onde você está; no desktop ela some, então
          o cabeçalho é o que nomeia a aba aberta. */}
      {current && (
        <PageHeader className="mb-4 hidden sm:flex" title={current.label} subtitle={current.subtitle} />
      )}

      <nav className="servant-tabbar">
        {tabs.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onTabChange(t.value)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem",
                borderRadius: "var(--radius)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "1.5rem" }}>
        {tab === "calendar" && <ServantCalendar schedules={schedules} />}
        {tab === "next" && (
          <ServantScheduleList
            schedules={schedules}
            monthFilter={{ year: nextMonth.getFullYear(), month: nextMonth.getMonth() }}
            emptyMessage="Nenhuma escala aberta para o mês que vem ainda."
          />
        )}
        {tab === "month" && (
          <ServantScheduleList
            schedules={schedules}
            monthFilter={{ year: today.getFullYear(), month: today.getMonth() }}
            emptyMessage="Nenhuma escala do seu setor com datas neste mês."
          />
        )}
        {tab === "all" && (
          <ServantScheduleList schedules={schedules} emptyMessage="Nenhuma escala encontrada para o seu setor." />
        )}
        {tab === "coordinator" && isCoordinator && (
          <CoordinatorSchedulePanel sectors={coordinatorSectors} />
        )}
      </div>
    </div>
  );
}
