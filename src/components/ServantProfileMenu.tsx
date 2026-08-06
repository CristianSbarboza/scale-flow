"use client";

import { useState } from "react";
import { User } from "lucide-react";
import SettingsModal from "@/components/SettingsModal";

interface ServantProfileMenuProps {
  name: string;
  sectorName: string;
  color: string | null;
}

export default function ServantProfileMenu({ name, sectorName, color }: ServantProfileMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        style={{
          width: "40px",
          height: "40px",
          background: color || "var(--primary)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Abrir configurações"
      >
        <User size={20} color="white" />
      </button>

      {showSettings && (
        <SettingsModal
          name={name}
          sectorName={sectorName}
          color={color}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
