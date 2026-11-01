"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import ProfileSection from "@/components/settings/ProfileSection";
import PersonalDataSection from "@/components/settings/PersonalDataSection";
import AiAssistantSection from "@/components/settings/AiAssistantSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import PanelStyleSection from "@/components/settings/PanelStyleSection";
import PasswordSection from "@/components/settings/PasswordSection";
import SessionSection from "@/components/settings/SessionSection";
import CloseButton from "@/components/ui/CloseButton";

interface Props {
  name: string;
  sectorName: string;
  color: string | null;
  icon: string | null;
  onClose: () => void;
}

/**
 * Configurações do servo. As seções são as mesmas de /admin/settings — a
 * diferença é que ali elas são uma página e aqui um modal, e que o servo tem
 * a seção de cor do painel, que não existe para admin e líder.
 *
 * Renderizado em portal no `document.body` para nunca ficar preso no bloco de
 * contenção criado por `backdrop-filter` na barra lateral ou no cabeçalho.
 */
export default function SettingsModal({ name, sectorName, color, icon, onClose }: Props) {
  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card glass flex max-h-[90dvh] w-full max-w-160 min-w-0 flex-col overflow-hidden p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2 sm:mb-6">
          <div className="flex min-w-0 items-center gap-2">
            <Settings size={18} className="shrink-0 text-primary" />
            <h3 className="truncate text-lg">Configurações</h3>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* -mr-2/-mr-3 devolve a faixa da barra de rolagem sem permitir arrasto lateral. */}
        <div className="-mr-2 grid min-h-0 min-w-0 flex-[1_1_auto] grid-cols-1 gap-4 overflow-x-hidden overflow-y-auto pr-2 sm:-mr-3 sm:gap-6 sm:pr-3">
          <ProfileSection name={name} subtitle={sectorName} color={color} icon={icon} editableIcon />
          <PersonalDataSection />
          <AiAssistantSection isAdmin={false} />
          <AppearanceSection />
          <PanelStyleSection color={color} />
          <PasswordSection />
          <SessionSection />
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
