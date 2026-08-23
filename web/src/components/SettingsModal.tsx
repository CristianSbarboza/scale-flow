"use client";

import { motion } from "framer-motion";
import { X, Settings } from "lucide-react";
import ProfileSection from "@/components/settings/ProfileSection";
import PhoneSection from "@/components/settings/PhoneSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import PanelStyleSection from "@/components/settings/PanelStyleSection";
import PasswordSection from "@/components/settings/PasswordSection";
import SessionSection from "@/components/settings/SessionSection";

interface Props {
  name: string;
  sectorName: string;
  color: string | null;
  onClose: () => void;
}

/**
 * Configurações do servo. As seções são as mesmas de /admin/settings — a
 * diferença é que ali elas são uma página e aqui um modal, e que o servo tem
 * a seção de cor do painel, que não existe para admin e líder.
 */
export default function SettingsModal({ name, sectorName, color, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card glass flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <h3 className="text-lg">Configurações</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="btn btn-ghost rounded-full p-2">
            <X size={18} />
          </button>
        </div>

        {/* -mr-3 pr-3 devolve a faixa da barra de rolagem: sem isso ela fica
            por cima do conteudo. */}
        <div className="-mr-3 grid min-h-0 flex-[1_1_auto] gap-6 overflow-y-auto pr-3">
          <ProfileSection name={name} subtitle={sectorName} color={color} />
          <PhoneSection />
          <AppearanceSection />
          <PanelStyleSection color={color} />
          <PasswordSection />
          <SessionSection />
        </div>
      </motion.div>
    </motion.div>
  );
}
