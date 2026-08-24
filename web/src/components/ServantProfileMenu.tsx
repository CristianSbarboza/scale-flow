"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import SettingsModal from "@/components/SettingsModal";

interface ServantProfileMenuProps {
  name: string;
  sectorName: string;
  color: string | null;
  icon: string | null;
}

export default function ServantProfileMenu({ name, sectorName, color, icon }: ServantProfileMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setShowSettings(true)} aria-label="Abrir configurações">
        <Avatar name={name} color={color} icon={icon} size="md" />
      </button>

      {showSettings && (
        <SettingsModal
          name={name}
          sectorName={sectorName}
          color={color}
          icon={icon}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
