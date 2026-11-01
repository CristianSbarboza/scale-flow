"use client";

import { CalendarDays, CalendarRange, CalendarPlus, ListChecks, ClipboardList, Sparkles } from "lucide-react";
import type { ServantOverviewSchedule, CoordinatorSector } from "@/types/domain";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";
import CoordinatorSchedulePanel from "@/components/CoordinatorSchedulePanel";
import AssistantChat from "@/components/AssistantChat";
import PageHeader from "@/components/ui/PageHeader";

export type ServantTab = "calendar" | "next" | "month" | "all" | "coordinator" | "assistant";

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

const ASSISTANT_TAB: ServantTabItem = {
  value: "assistant",
  label: "Assistente",
  icon: Sparkles,
  subtitle: "Converse com a assistente ministerial para consultar e organizar suas escalas.",
};

export function getServantTabs(isCoordinator: boolean): ServantTabItem[] {
  return isCoordinator
    ? [...BASE_TABS, COORDINATOR_TAB, ASSISTANT_TAB]
    : [...BASE_TABS, ASSISTANT_TAB];
}

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  userName?: string;
  tab: ServantTab;
  onTabChange: (tab: ServantTab) => void;
}

export default function ServantHome({ schedules, coordinatorSectors, userName = "", tab, onTabChange }: ServantHomeProps) {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const isCoordinator = coordinatorSectors.length > 0;
  const tabs = getServantTabs(isCoordinator);
  const mobileBarTabs = tabs.filter((t) => t.value !== "assistant");
  const current = tabs.find((t) => t.value === tab);

  return (
    <div className="servant-tab-content">
      {/* No celular a tab bar já diz onde você está; no desktop ela some, então
          o cabeçalho é o que nomeia a aba aberta. */}
      {current && tab !== "assistant" && (
        <PageHeader className="mb-4 hidden sm:flex" title={current.label} subtitle={current.subtitle} />
      )}

      <nav className="servant-tabbar">
        {mobileBarTabs.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onTabChange(t.value)}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.25rem",
                borderRadius: "var(--radius)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              <t.icon size={20} />
              <span className="max-w-full truncate">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* No celular, o botão da assistente flutua no canto inferior direito
          acima da barra de navegação. */}
      {tab !== "assistant" && (
        <button
          type="button"
          onClick={() => onTabChange("assistant")}
          aria-label="Abrir Assistente IA"
          title="Assistente IA"
          className="fixed right-4 bottom-22 z-40 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95 sm:hidden"
        >
          <Sparkles size={22} />
        </button>
      )}

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
        {tab === "assistant" && (
          <AssistantChat
            role="servant"
            isCoordinator={isCoordinator}
            userName={userName}
          />
        )}
      </div>
    </div>
  );
}
