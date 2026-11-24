"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import SettingsSection from "@/components/ui/SettingsSection";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Switch from "@/components/ui/Switch";
import {
  disconnectOwnGoogleAccount,
  getOwnGoogleAccountStatus,
  syncOwnGoogleCalendarNow,
  toggleOwnGoogleCalendarSync,
  type OwnGoogleAccountStatus,
} from "@/lib/actions/google";
import { useToast } from "@/components/Toast";

export default function GoogleAccountSection({
  returnTo = "/servant",
}: {
  returnTo?: string;
}) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<OwnGoogleAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await getOwnGoogleAccountStatus();
      setStatus(data);
    } catch {
      showToast("Não foi possível carregar o status da conta Google.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
    window.location.href = `/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleToggleSync = async (next: boolean) => {
    if (!status) return;
    setToggling(true);
    setStatus({ ...status, calendarSyncEnabled: next });
    try {
      const res = await toggleOwnGoogleCalendarSync(next);
      await loadStatus();
      showToast(
        next
          ? `Sincronização ativada (${res.synced} ${res.synced === 1 ? "data sincronizada" : "datas sincronizadas"}).`
          : "Sincronização com Google Agenda pausada.",
        "success",
      );
    } catch (error) {
      setStatus({ ...status, calendarSyncEnabled: !next });
      showToast(
        error instanceof Error ? error.message : "Erro ao alterar sincronização.",
        "error",
      );
    } finally {
      setToggling(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await syncOwnGoogleCalendarNow();
      await loadStatus();
      showToast(
        `Google Agenda atualizado (${res.synced} ${res.synced === 1 ? "evento ativo" : "eventos ativos"}).`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao sincronizar com Google Agenda.",
        "error",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectOwnGoogleAccount();
      await loadStatus();
      showToast("Conta Google desvinculada e eventos removidos da agenda.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao desvincular conta Google.",
        "error",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SettingsSection title="Google & Google Agenda" icon={<Calendar size={14} />}>
      {loading || !status ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !status.connected ? (
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            Conecte sua conta Google para poder{" "}
            <strong className="text-foreground">entrar com 1 clique pelo Google</strong>{" "}
            e fazer com que todas as datas em que você estiver escalado(a) apareçam
            automaticamente na sua <strong className="text-foreground">Google Agenda</strong>.
          </p>

          {!status.isConfiguredOnServer && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Para habilitar o OAuth do Google, adicione{" "}
              <code className="text-primary">GOOGLE_CLIENT_ID</code> e{" "}
              <code className="text-primary">GOOGLE_CLIENT_SECRET</code> nas
              variáveis de ambiente (com redirect URI{" "}
              <code className="break-all text-foreground">/api/google/callback</code>{" "}
              e{" "}
              <code className="break-all text-foreground">
                /api/auth/callback/google
              </code>
              ).
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            disabled={!status.isConfiguredOnServer}
            onClick={handleConnect}
            className="w-full sm:w-auto sm:justify-self-start"
          >
            <Link2 size={16} />
            Conectar com o Google
          </Button>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Conta vinculada:</span>
            <Badge
              tone="success"
              solid
              icon={<CheckCircle2 size={13} className="shrink-0" />}
              className="max-w-full min-w-0"
            >
              <span className="truncate">{status.googleEmail}</span>
            </Badge>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">
                Sincronizar escalas com o Google Agenda
              </p>
              <p className="text-[0.8125rem] text-muted-foreground">
                Cria e atualiza automaticamente na sua agenda os dias em que você
                for confirmado(a) ({status.syncedEventsCount}{" "}
                {status.syncedEventsCount === 1
                  ? "data sincronizada"
                  : "datas sincronizadas"}
                ).
              </p>
            </div>

            <Switch
              checked={status.calendarSyncEnabled}
              onChange={handleToggleSync}
              disabled={toggling || syncing || disconnecting}
              label="Sincronizar escalas com o Google Agenda"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {status.calendarSyncEnabled && (
              <Button
                type="button"
                variant="secondary"
                disabled={syncing || disconnecting}
                onClick={handleSyncNow}
                className="w-full sm:w-auto"
              >
                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Sincronizando..." : "Sincronizar Agenda Agora"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={disconnecting || syncing}
              onClick={handleDisconnect}
              className="w-full sm:w-auto"
            >
              <Unlink size={16} />
              {disconnecting ? "Desvinculando..." : "Desvincular Google"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
