"use client";

import { Bell } from "lucide-react";

interface ServantNotificationsButtonProps {
  unreadCount: number;
  active?: boolean;
  onClick: () => void;
}

export default function ServantNotificationsButton({
  unreadCount,
  active = false,
  onClick,
}: ServantNotificationsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Notificações (${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"})`
          : "Notificações"
      }
      title="Notificações"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        color: active ? "var(--primary)" : "var(--foreground)",
        background: active
          ? "color-mix(in oklab, var(--primary) 15%, transparent)"
          : "transparent",
        transition: "background 150ms, color 150ms",
      }}
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            minWidth: "18px",
            height: "18px",
            padding: "0 4px",
            borderRadius: "9999px",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: "0.6875rem",
            fontWeight: 700,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--background)",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
