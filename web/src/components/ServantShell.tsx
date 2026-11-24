"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BellRing } from "lucide-react";
import type {
  ServantOverviewSchedule,
  CoordinatorSector,
  ServantNotificationItem,
} from "@/types/domain";
import ServantHome, { getServantTabs, type ServantTab } from "@/components/ServantHome";
import ServantSidebar from "@/components/ServantSidebar";
import ServantProfileMenu from "@/components/ServantProfileMenu";
import NotificationBell from "@/components/NotificationBell";
import ServantNotificationsButton from "@/components/ServantNotificationsButton";
import Button from "@/components/ui/Button";
import {
  getServantNotificationState,
  markAllServantNotificationsAsRead,
  markServantNotificationAsRead,
  removePushSubscription,
  savePushSubscription,
  updateOwnNotificationsEnabled,
} from "@/lib/actions/notifications";
import {
  getBrowserNotificationPermission,
  requestAndSubscribeBrowserPush,
  syncExistingPushSubscription,
  unsubscribeBrowserPush,
} from "@/lib/push-client";
import { useToast } from "@/components/Toast";

interface ServantShellProps {
  name: string;
  sectorName: string;
  color: string | null;
  icon: string | null;
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  /** Aba aberta ao entrar. Vem de `?aba=` na URL, lida pela página. */
  initialTab?: ServantTab;
  initialNotifications: ServantNotificationItem[];
  initialNotificationsEnabled: boolean;
  vapidPublicKey: string;
}

export default function ServantShell({
  name,
  sectorName,
  color,
  icon,
  schedules,
  coordinatorSectors,
  initialTab,
  initialNotifications,
  initialNotificationsEnabled,
  vapidPublicKey,
}: ServantShellProps) {
  const { showToast } = useToast();
  // Só o estado inicial vem de fora; trocar de aba depois é estado local.
  const [tab, setTab] = useState<ServantTab>(initialTab ?? "calendar");
  const tabs = getServantTabs(coordinatorSectors.length > 0);

  const [notifications, setNotifications] =
    useState<ServantNotificationItem[]>(initialNotifications);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    initialNotificationsEnabled,
  );
  // Se o servo ainda não aceitou (notificationsEnabled === false), mostra o
  // convite sempre que entrar no app. Se clicar em "Agora não", fecha só nesta
  // sessão em memória e volta a perguntar na próxima entrada.
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [acceptingPrompt, setAcceptingPrompt] = useState(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const state = await getServantNotificationState();
      setNotifications(state.notifications);
      setNotificationsEnabled(state.notificationsEnabled);
    } catch (error) {
      console.error(error);
    }
  }, []);

  // Se o servo já aceitou as notificações e o navegador já tem permissão
  // "granted", garante que o Service Worker e a inscrição de Web Push estejam
  // sincronizados no banco para receber alertas com a tela apagada.
  useEffect(() => {
    if (!notificationsEnabled || !vapidPublicKey) return;
    if (getBrowserNotificationPermission() !== "granted") return;

    syncExistingPushSubscription(vapidPublicKey)
      .then((sub) => {
        if (sub) return savePushSubscription(sub);
      })
      .catch(() => {});
  }, [notificationsEnabled, vapidPublicKey]);

  useEffect(() => {
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notificationsEnabled
    ? notifications.filter((n) => !n.read).length
    : 0;

  const handleMarkAsRead = async (key: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.key === key ? { ...item, read: true } : item)),
    );
    try {
      await markServantNotificationAsRead(key);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadKeys = notifications.filter((n) => !n.read).map((n) => n.key);
    if (unreadKeys.length === 0) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllServantNotificationsAsRead(unreadKeys);
      showToast("Todas as notificações foram marcadas como vistas.", "success");
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleNotificationsEnabled = async (next: boolean) => {
    setNotificationsEnabled(next);
    try {
      await updateOwnNotificationsEnabled(next);
      if (next) {
        const { subscription } = await requestAndSubscribeBrowserPush(vapidPublicKey);
        if (subscription) {
          await savePushSubscription(subscription);
        }
        setPromptDismissed(false);
        await refreshNotifications();
      } else {
        const endpoint = await unsubscribeBrowserPush();
        if (endpoint) {
          await removePushSubscription(endpoint).catch(() => {});
        }
      }
      showToast(
        next ? "Notificações ativadas com sucesso!" : "Notificações desativadas.",
        "success",
      );
    } catch (error) {
      setNotificationsEnabled(!next);
      showToast(
        error instanceof Error ? error.message : "Erro ao atualizar notificações.",
        "error",
      );
    }
  };

  const handleAcceptFromPrompt = async () => {
    setAcceptingPrompt(true);
    try {
      await handleToggleNotificationsEnabled(true);
    } finally {
      setAcceptingPrompt(false);
    }
  };

  const showConsentModal = !notificationsEnabled && !promptDismissed;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      <ServantSidebar
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        name={name}
        sectorName={sectorName}
        color={color}
        icon={icon}
        unreadNotificationsCount={unreadCount}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          className="glass servant-header servant-header-mobile-row"
          style={{
            padding: "1rem 1.25rem",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image
              src="/logo-mark.png"
              alt=""
              width={28}
              height={28}
              style={{ borderRadius: "7px" }}
            />
            <span
              style={{
                fontFamily: "var(--font-logo)",
                fontWeight: 400,
                fontSize: "1.5rem",
                color: "var(--primary)",
                letterSpacing: "1px",
              }}
            >
              ScaleFlow
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <NotificationBell />
            <ServantNotificationsButton
              unreadCount={unreadCount}
              active={tab === "notifications"}
              onClick={() => setTab("notifications")}
            />
            <ServantProfileMenu
              name={name}
              sectorName={sectorName}
              color={color}
              icon={icon}
            />
          </div>
        </header>

        <main style={{ padding: "2rem 1.5rem" }}>
          <ServantHome
            schedules={schedules}
            coordinatorSectors={coordinatorSectors}
            userName={name}
            tab={tab}
            onTabChange={setTab}
            notifications={notifications}
            notificationsEnabled={notificationsEnabled}
            onToggleNotificationsEnabled={handleToggleNotificationsEnabled}
            onMarkNotificationAsRead={handleMarkAsRead}
            onMarkAllNotificationsAsRead={handleMarkAllAsRead}
          />
        </main>
      </div>

      {/* Sempre que entrar no app com notificationsEnabled === false, convida a aceitar */}
      {showConsentModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="card glass w-full max-w-md animate-fade-in">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <BellRing size={24} />
              </div>
              <h3 className="text-lg font-bold">Ativar notificações de escala?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Você está com as notificações desativadas. Ative para receber no aplicativo os avisos de novas escalas abertas, confirmações e lembretes de culto.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  type="button"
                  disabled={acceptingPrompt}
                  onClick={() => setPromptDismissed(true)}
                  className="w-full sm:w-auto"
                >
                  Agora não
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  disabled={acceptingPrompt}
                  onClick={handleAcceptFromPrompt}
                  className="w-full sm:w-auto"
                >
                  <BellRing size={16} />
                  {acceptingPrompt ? "Ativando..." : "Aceitar notificações"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
