"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, ListChecks } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";
import ServantCalendar from "@/components/ServantCalendar";
import ServantScheduleList from "@/components/ServantScheduleList";

type Tab = "calendar" | "month" | "all";

const TABS: { value: Tab; label: string; icon: typeof CalendarDays }[] = [
  { value: "calendar", label: "Calendário", icon: CalendarDays },
  { value: "month", label: "Escalas do Mês", icon: CalendarRange },
  { value: "all", label: "Todas as Escalas", icon: ListChecks },
];

interface ServantHomeProps {
  schedules: ServantOverviewSchedule[];
}

export default function ServantHome({ schedules }: ServantHomeProps) {
  const [tab, setTab] = useState<Tab>("calendar");
  const today = new Date();

  return (
    <div className="servant-tab-content">
      <nav className="servant-tabbar">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
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
      </div>
    </div>
  );
}
