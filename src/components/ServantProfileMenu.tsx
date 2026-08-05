"use client";

import { useState } from "react";
import Link from "next/link";
import { User, LogOut, Settings } from "lucide-react";
import SettingsModal from "@/components/SettingsModal";

interface ServantProfileMenuProps {
  name: string;
  sectorName: string;
}

export default function ServantProfileMenu({ name, sectorName }: ServantProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "40px",
          height: "40px",
          background: "var(--primary)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Abrir menu do perfil"
      >
        <User size={20} color="white" />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
          />
          <div
            className="card glass"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 0.5rem)",
              width: "220px",
              padding: "1rem",
              zIndex: 31,
            }}
          >
            <p style={{ fontWeight: 600 }}>{name}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>{sectorName}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowSettings(true);
              }}
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "flex-start", padding: "0.5rem" }}
            >
              <Settings size={16} />
              Configurações
            </button>
            <Link
              href="/api/auth/signout"
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "flex-start", padding: "0.5rem", color: "#ef4444" }}
            >
              <LogOut size={16} />
              Sair
            </Link>
          </div>
        </>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
