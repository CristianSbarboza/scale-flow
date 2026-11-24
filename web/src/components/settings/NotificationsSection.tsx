"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import SettingsSection from "@/components/ui/SettingsSection";
import Switch from "@/components/ui/Switch";
import {
  getServantNotificationState,
  updateOwnNotificationsEnabled,
} from "@/lib/actions/notifications";
import { useToast } from "@/components/Toast";

export default function NotificationsSection({
  onChanged,
}: {
  onChanged?: (enabled: boolean) => void;
}) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getServantNotificationState()
      .then((state) => {
        if (!active) return;
        setEnabled(state.notificationsEnabled);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    setEnabled(next);
    try {
      await updateOwnNotificationsEnabled(next);
      onChanged?.(next);
      showToast(
        next ? "Notificações ativadas." : "Notificações desativadas.",
        "success",
      );
    } catch (error) {
      setEnabled(!next);
      showToast(
        error instanceof Error ? error.message : "Erro ao atualizar notificações.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Notificações" icon={<Bell size={14} />}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold">
            Receber notificações de escala
          </p>
          <p className="text-[0.8125rem] text-muted-foreground">
            Avisos de novas escalas abertas, confirmações e lembretes de culto.
          </p>
        </div>

        <Switch
          checked={enabled}
          onChange={handleToggle}
          disabled={loading || saving}
          label="Receber notificações de escala"
        />
      </div>
    </SettingsSection>
  );
}
