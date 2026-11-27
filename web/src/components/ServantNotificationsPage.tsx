"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BellOff,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCheck,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import type { ServantNotificationItem } from "@/types/domain";
import type { ServantTab } from "@/components/ServantHome";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import {
  getServantNotificationState,
  savePushSubscription,
  sendTestPushNotification,
} from "@/lib/actions/notifications";
import {
  getBrowserNotificationPermission,
  requestAndSubscribeBrowserPush,
} from "@/lib/push-client";
import { useToast } from "@/components/Toast";

interface ServantNotificationsPageProps {
  notifications: ServantNotificationItem[];
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: (next: boolean) => Promise<void>;
  onMarkAsRead: (key: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onNavigateTab: (tab: ServantTab) => void;
}

function getKindMeta(kind: ServantNotificationItem["kind"]) {
  switch (kind) {
    case "schedule_published":
      return {
        label: "Nova escala aberta",
        Icon: CalendarPlus,
      };
    case "day_before":
    case "two_hours":
      return {
        label: "Lembrete de culto",
        Icon: BellRing,
      };
    default:
      return {
        label: "Escalação confirmada",
        Icon: CalendarCheck,
      };
  }
}

export default function ServantNotificationsPage({
  notifications,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateTab,
}: ServantNotificationsPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const handleTestPushOnDevice = async () => {
    setTestingPush(true);
    try {
      const state = await getServantNotificationState();
      const perm = getBrowserNotificationPermission();
      if (perm === "unsupported") {
        showToast(
          "Este navegador não suporta Web Push. No iPhone, instale o app na Tela de Início primeiro.",
          "error",
        );
        return;
      }

      const { permission, subscription } = await requestAndSubscribeBrowserPush(
        state.vapidPublicKey,
      );
      if (permission !== "granted" || !subscription) {
        showToast(
          "Permita as notificações nas configurações do navegador para receber na tela bloqueada.",
          "error",
        );
        return;
      }

      await savePushSubscription(subscription);
      const sent = await sendTestPushNotification();
      if (sent > 0) {
        showToast("Alerta enviado! Confira a notificação no seu aparelho.", "success");
      } else {
        showToast("Aparelho conectado para receber alertas na tela bloqueada!", "success");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao testar alerta no aparelho.",
        "error",
      );
    } finally {
      setTestingPush(false);
    }
  };

  const selectedItem =
    selectedKey !== null
      ? notifications.find((n) => n.key === selectedKey) ?? null
      : null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenNotification = (item: ServantNotificationItem) => {
    setSelectedKey(item.key);
    if (!item.read) {
      void onMarkAsRead(item.key);
    }
  };

  const handleToggleEnabled = async (next: boolean) => {
    setToggling(true);
    try {
      await onToggleNotificationsEnabled(next);
    } finally {
      setToggling(false);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await onMarkAllAsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  // Visualização completa da notificação selecionada ("clicou vai para a notificação toda")
  if (selectedItem) {
    const { label, Icon } = getKindMeta(selectedItem.kind);

    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="mb-4">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setSelectedKey(null)}
            className="px-2 py-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Voltar para todas as notificações
          </Button>
        </div>

        <article className="card glass overflow-hidden">
          <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                {label}
              </span>
              <h2 className="mt-0.5 text-lg font-bold wrap-break-word">
                {selectedItem.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedItem.ministryName} · {selectedItem.sectorName}
              </p>
            </div>
          </div>

          {/* Corpo da mensagem completa no mesmo formato da mensagem do WhatsApp */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-4 sm:p-5">
            <p className="text-base font-semibold text-foreground">
              {selectedItem.greeting}
            </p>

            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              {selectedItem.headline}
            </p>

            <div className="grid gap-1.5 rounded-lg border border-card-border bg-card p-3.5 text-sm">
              {selectedItem.details.map((detail) => (
                <p key={detail.label} className="wrap-break-word">
                  <strong className="font-semibold text-foreground">
                    {detail.label}:
                  </strong>{" "}
                  <span className="text-muted-foreground">{detail.value}</span>
                </p>
              ))}
            </div>

            {selectedItem.callToActionText && (
              <p className="text-sm text-muted-foreground">
                {selectedItem.callToActionText}
              </p>
            )}

            {/* Versículo bíblico igual ao enviado no WhatsApp */}
            <blockquote className="rounded-lg border-l-4 border-primary bg-card/80 p-3.5 text-sm">
              <p className="text-foreground italic">
                &ldquo;{selectedItem.verse.text}&rdquo;
              </p>
              <footer className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
                <BookOpen size={13} />
                <span>— {selectedItem.verse.reference}</span>
              </footer>
            </blockquote>

            <p className="text-xs text-muted-foreground italic">
              Mensagem automática do ScaleFlow.
            </p>
          </div>

          {/* Ação rápida contextual */}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {selectedItem.kind === "schedule_published" &&
            selectedItem.scheduleShareLink &&
            selectedItem.servantId ? (
              <Button
                variant="primary"
                type="button"
                onClick={() =>
                  router.push(
                    `/escala/${selectedItem.scheduleShareLink}?from=servant&servantId=${selectedItem.servantId}`,
                  )
                }
              >
                <CalendarPlus size={16} />
                Informar disponibilidade
              </Button>
            ) : (
              <Button
                variant="primary"
                type="button"
                onClick={() => onNavigateTab("calendar")}
              >
                <CalendarDays size={16} />
                Ver no meu calendário
              </Button>
            )}
          </div>
        </article>
      </div>
    );
  }

  // Lista de notificações ("com um título e um início. clicou vai para a notificação toda")
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="card glass mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">Notificações</h2>
            <p className="text-xs text-muted-foreground">
              {notificationsEnabled ? "Ativadas" : "Pausadas"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={notificationsEnabled}
              onChange={handleToggleEnabled}
              disabled={toggling}
              label="Ativar ou desativar notificações"
            />
            <span className="text-xs font-medium text-muted-foreground">
              {notificationsEnabled ? "Ativadas" : "Desativadas"}
            </span>
          </div>

          {notificationsEnabled && (
            <Button
              variant="outline"
              type="button"
              disabled={testingPush}
              onClick={handleTestPushOnDevice}
              className="px-3 py-1.5 text-xs"
            >
              <Smartphone size={15} />
              {testingPush ? "Ativando no aparelho..." : "Ativar / Testar no aparelho"}
            </Button>
          )}

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              type="button"
              disabled={markingAll}
              onClick={handleMarkAll}
              className="px-3 py-1.5 text-xs"
            >
              <CheckCheck size={15} />
              Marcar todas como vistas ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {!notificationsEnabled ? (
        <div className="card glass py-12 text-center">
          <BellOff size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold">Notificações desativadas</p>
          <Button
            variant="primary"
            type="button"
            disabled={toggling}
            onClick={() => handleToggleEnabled(true)}
            className="mt-4"
          >
            <Bell size={16} />
            Ativar
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card glass py-12 text-center text-muted-foreground">
          Nenhuma notificação até o momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {notifications.map((item) => {
            const { label, Icon } = getKindMeta(item.kind);
            const isUnread = !item.read;

            return (
              <motion.button
                key={item.key}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleOpenNotification(item)}
                className="card glass flex w-full items-start justify-between gap-3.5 text-left transition-colors hover:border-primary/50"
                style={{
                  borderLeft: isUnread
                    ? "4px solid var(--primary)"
                    : "1px solid var(--card-border)",
                  background: isUnread
                    ? "color-mix(in oklab, var(--primary) 6%, var(--card))"
                    : undefined,
                }}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: isUnread
                        ? "color-mix(in oklab, var(--primary) 18%, transparent)"
                        : "var(--muted)",
                      color: isUnread ? "var(--primary)" : "var(--muted-foreground)",
                    }}
                  >
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                        {label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {item.ministryName} · {item.sectorName}
                      </span>
                      {isUnread && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Nova
                        </span>
                      )}
                    </div>

                    {/* Título da notificação */}
                    <h3
                      className="text-sm wrap-break-word sm:text-base"
                      style={{ fontWeight: isUnread ? 700 : 600 }}
                    >
                      {item.title}
                    </h3>

                    {/* Início da mensagem (preview estilo WhatsApp) */}
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {item.preview}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="mt-2 shrink-0 text-muted-foreground"
                />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
