"use client";

import { X, Clock, CalendarDays } from "lucide-react";
import type { ServantOverviewSchedule } from "@/lib/actions";

interface ServantScheduleDetailModalProps {
  schedule: ServantOverviewSchedule;
  onClose: () => void;
}

function statusFor(date: ServantOverviewSchedule["dates"][number]) {
  if (date.confirmed) return { label: "Confirmado", color: "#10b981" };
  if (date.available) return { label: "Disponibilidade enviada (aguardando confirmação)", color: "var(--primary)" };
  return { label: "Não enviado", color: "var(--muted-foreground)" };
}

export default function ServantScheduleDetailModal({ schedule, onClose }: ServantScheduleDetailModalProps) {
  const sortedDates = [...schedule.dates].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-lg max-h-[85vh]"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ marginBottom: "0.25rem" }}>{schedule.name}</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>{schedule.ministryName}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{schedule.sectorName}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto", display: "grid", gap: "0.75rem" }}>
          {sortedDates.map((date) => {
            const status = statusFor(date);
            return (
              <div
                key={date.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "var(--muted)",
                  borderRadius: "var(--radius)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontWeight: 600, fontSize: "0.9375rem" }}>
                    <CalendarDays size={16} color="var(--primary)" />
                    {new Date(`${date.date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    <Clock size={13} /> {date.startTime.slice(0, 5)}
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: status.color, textAlign: "right" }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
