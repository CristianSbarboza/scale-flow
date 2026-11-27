"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CalendarRange, CalendarPlus, ListChecks, ClipboardList, Sparkles, Trophy } from "lucide-react";
import type { ServantOverviewSchedule, CoordinatorSector, ServantNotificationItem } from "@/types/domain";
import type { QuizDashboardData } from "@/lib/actions/quiz";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";
import CoordinatorSchedulePanel from "@/components/CoordinatorSchedulePanel";
import AssistantChat from "@/components/AssistantChat";
import ServantNotificationsPage from "@/components/ServantNotificationsPage";
import ServantQuizPage from "@/components/ServantQuizPage";
import PageHeader from "@/components/ui/PageHeader";

export type ServantTab =
  | "calendar"
  | "next"
  | "month"
  | "all"
  | "coordinator"
  | "minigame"
  | "assistant"
  | "notifications";

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

const MINIGAME_TAB: ServantTabItem = {
  value: "minigame",
  label: "Desafio",
  icon: Trophy,
  subtitle: "Pergunta do dia e ranking mensal.",
};

const ASSISTANT_TAB: ServantTabItem = {
  value: "assistant",
  label: "Assistente",
  icon: Sparkles,
  subtitle: "Assistente ministerial.",
};

export function getServantTabs(isCoordinator: boolean): ServantTabItem[] {
  return isCoordinator
    ? [...BASE_TABS, COORDINATOR_TAB, MINIGAME_TAB, ASSISTANT_TAB]
    : [...BASE_TABS, MINIGAME_TAB, ASSISTANT_TAB];
}

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  userName?: string;
  tab: ServantTab;
  onTabChange: (tab: ServantTab) => void;
  notifications: ServantNotificationItem[];
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: (next: boolean) => Promise<void>;
  onMarkNotificationAsRead: (key: string) => Promise<void>;
  onMarkAllNotificationsAsRead: () => Promise<void>;
  initialQuizData: QuizDashboardData;
}

export default function ServantHome({
  schedules,
  coordinatorSectors,
  userName = "",
  tab,
  onTabChange,
  notifications,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  initialQuizData,
}: ServantHomeProps) {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const isCoordinator = coordinatorSectors.length > 0;
  const tabs = getServantTabs(isCoordinator);
  const mobileBarTabs = tabs.filter((t) => t.value !== "assistant" && t.value !== "minigame");
  const current = tabs.find((t) => t.value === tab);

  return (
    <div className="servant-tab-content">
      {/* No celular a tab bar já diz onde você está; no desktop ela some, então
          o cabeçalho é o que nomeia a aba aberta. */}
      {current && tab !== "assistant" && (
        <PageHeader className="mb-4 hidden sm:flex" title={current.label} subtitle={current.subtitle} />
      )}
      {tab === "notifications" && (
        <PageHeader
          className="mb-4 hidden sm:flex"
          title="Notificações"
        />
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
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.25rem",
                borderRadius: "var(--radius)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                transition: "color 180ms ease",
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="servantMobileTabActiveBg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="pointer-events-none absolute inset-0 rounded-xl bg-primary/12"
                />
              )}
              <motion.span
                animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className="relative z-10 inline-flex"
              >
                <t.icon size={20} />
              </motion.span>
              <span className="relative z-10 max-w-full truncate">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* No celular, o botão do mini game flutua logo acima do botão da assistente IA
          (apenas para os servos). */}
      {tab !== "minigame" && (
        <button
          type="button"
          onClick={() => onTabChange("minigame")}
          aria-label="Abrir Desafio e Ranking"
          title="Desafio & Ranking"
          className="fixed right-4 bottom-38 z-40 flex size-13 items-center justify-center rounded-full border border-primary/50 bg-card text-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95 sm:hidden"
        >
          <Trophy size={22} />
        </button>
      )}

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
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
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
            {tab === "minigame" && <ServantQuizPage initialData={initialQuizData} />}
            {tab === "assistant" && (
              <AssistantChat
                role="servant"
                isCoordinator={isCoordinator}
                userName={userName}
              />
            )}
            {tab === "notifications" && (
              <ServantNotificationsPage
                notifications={notifications}
                notificationsEnabled={notificationsEnabled}
                onToggleNotificationsEnabled={onToggleNotificationsEnabled}
                onMarkAsRead={onMarkNotificationAsRead}
                onMarkAllAsRead={onMarkAllNotificationsAsRead}
                onNavigateTab={onTabChange}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
