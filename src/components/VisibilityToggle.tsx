"use client";

import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

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
    <div className="grid gap-2">
      <label className="text-[0.8125rem] font-semibold">Acesso à escala</label>
      <div role="radiogroup" aria-label="Acesso à escala" className="flex gap-2">
        {OPTIONS.map((o) => {
          const isActive = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(o.value)}
              className={cn(
                "btn flex-1 border bg-transparent p-2 text-[0.8125rem] transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
              )}
            >
              <o.icon size={15} />
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{active.hint}</p>
    </div>
  );
}
