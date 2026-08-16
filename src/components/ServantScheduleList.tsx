"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import type { ServantOverviewSchedule } from "@/types/domain";
import ServantScheduleDetailModal from "@/components/ServantScheduleDetailModal";

interface ServantScheduleListProps {
  schedules: ServantOverviewSchedule[];
  monthFilter?: { year: number; month: number };
  emptyMessage: string;
}

export default function ServantScheduleList({ schedules, monthFilter, emptyMessage }: ServantScheduleListProps) {
  const router = useRouter();
  const [selectedSchedule, setSelectedSchedule] = useState<ServantOverviewSchedule | null>(null);

  const visibleSchedules = monthFilter
    ? schedules.filter((s) =>
        s.dates.some((d) => {
          const parsed = new Date(`${d.date.slice(0, 10)}T00:00:00`);
          return parsed.getFullYear() === monthFilter.year && parsed.getMonth() === monthFilter.month;
        })
      )
    : schedules;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {visibleSchedules.length === 0 && (
        <div className="card glass" style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
          {emptyMessage}
        </div>
      )}
      {visibleSchedules.map((schedule) => {
        const filled = schedule.dates.some((d) => d.available);
        return (
          <button
            key={schedule.id}
            type="button"
            onClick={() => {
              if (filled) {
                setSelectedSchedule(schedule);
              } else {
                router.push(`/escala/${schedule.shareLink}?from=servant&servantId=${schedule.servantId}`);
              }
            }}
            className="card glass"
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1.0625rem", marginBottom: "0.25rem" }}>{schedule.name}</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{schedule.ministryName}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{schedule.sectorName}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  <Calendar size={14} /> {schedule.dates.length} {schedule.dates.length === 1 ? "data" : "datas"}
                </div>
              </div>
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "1rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  background: filled ? "rgba(16, 185, 129, 0.15)" : "rgba(249, 115, 22, 0.15)",
                  color: filled ? "#10b981" : "var(--primary)",
                }}
              >
                {filled ? "Preenchido" : "Pendente"}
              </span>
            </div>
          </button>
        );
      })}

      {selectedSchedule && (
        <ServantScheduleDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
      )}
    </div>
  );
}
