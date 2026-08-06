"use client";

import { CalendarDays, CalendarRange, ListChecks, ClipboardList } from "lucide-react";
import type { ServantOverviewSchedule, CoordinatorSector } from "@/lib/actions";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";
import CoordinatorSchedulePanel from "@/components/CoordinatorSchedulePanel";

export type ServantTab = "calendar" | "month" | "all" | "coordinator";

export interface ServantTabItem {
  value: ServantTab;
  label: string;
  icon: typeof CalendarDays;
}

const BASE_TABS: ServantTabItem[] = [
  { value: "calendar", label: "Calendário", icon: CalendarDays },
  { value: "month", label: "Escalas do Mês", icon: CalendarRange },
  { value: "all", label: "Todas as Escalas", icon: ListChecks },
];

export function getServantTabs(isCoordinator: boolean): ServantTabItem[] {
  return isCoordinator
    ? [...BASE_TABS, { value: "coordinator", label: "Gestão de Escala", icon: ClipboardList }]
    : BASE_TABS;
}

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  tab: ServantTab;
  onTabChange: (tab: ServantTab) => void;
}

export default function ServantHome({ schedules, coordinatorSectors, tab, onTabChange }: ServantHomeProps) {
  const today = new Date();
  const isCoordinator = coordinatorSectors.length > 0;
  const tabs = getServantTabs(isCoordinator);

  return (
    <div className="servant-tab-content">
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
