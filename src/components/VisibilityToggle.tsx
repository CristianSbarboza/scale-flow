"use client";

import { Globe, Lock } from "lucide-react";

export type ScheduleVisibility = "public" | "private";

interface Props {
  value: ScheduleVisibility;
  onChange: (value: ScheduleVisibility) => void;
}

const OPTIONS = [
  {
    value: "public" as const,
    label: "Público",
    icon: Globe,
    hint: "Qualquer pessoa com o link responde, sem precisar de login.",
  },
  {
    value: "private" as const,
    label: "Privado",
    icon: Lock,
    hint: "Só servos do setor, já logados no sistema, conseguem responder.",
  },
];

export default function VisibilityToggle({ value, onChange }: Props) {
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Acesso à escala</label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {OPTIONS.map((o) => {
          const isActive = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem" }}
            >
              <o.icon size={15} />
              {o.label}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{active.hint}</p>
    </div>
  );
}
