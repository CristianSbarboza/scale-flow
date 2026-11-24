"use client";

export interface SerializedPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isBrowserPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserPushSupported()) return "unsupported";
  return Notification.permission;
}

function serializeSubscription(sub: PushSubscription): SerializedPushSubscription | null {
  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

/**
 * Registra o Service Worker e sincroniza a inscrição existente caso a permissão
 * do navegador já seja "granted" (sem abrir popup do sistema operacional).
 */
export async function syncExistingPushSubscription(
  vapidPublicKey: string,
): Promise<SerializedPushSubscription | null> {
  if (!isBrowserPushSupported() || !vapidPublicKey) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    return serializeSubscription(sub);
  } catch (error) {
    console.error("Falha ao sincronizar Web Push:", error);
    return null;
  }
}

/**
 * Solicita permissão de notificação ao sistema operacional (deve ser chamado
 * dentro de um clique do usuário) e cria a inscrição de Web Push.
 */
export async function requestAndSubscribeBrowserPush(
  vapidPublicKey: string,
): Promise<{
  permission: NotificationPermission | "unsupported";
  subscription: SerializedPushSubscription | null;
}> {
  if (!isBrowserPushSupported() || !vapidPublicKey) {
    return { permission: "unsupported", subscription: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { permission, subscription: null };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return {
      permission,
      subscription: serializeSubscription(sub),
    };
  } catch (error) {
    console.error("Falha ao registrar Web Push:", error);
    return { permission: Notification.permission, subscription: null };
  }
}

export async function unsubscribeBrowserPush(): Promise<string | null> {
  if (!isBrowserPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await registration?.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch {
    return null;
  }
}
