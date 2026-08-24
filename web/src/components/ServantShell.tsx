"use client";

import { useState } from "react";
import Image from "next/image";
import type { ServantOverviewSchedule, CoordinatorSector } from "@/types/domain";
import ServantHome, { getServantTabs, type ServantTab } from "@/components/ServantHome";
import ServantSidebar from "@/components/ServantSidebar";
import ServantProfileMenu from "@/components/ServantProfileMenu";
import NotificationBell from "@/components/NotificationBell";

interface ServantShellProps {
  name: string;
  sectorName: string;
  color: string | null;
  icon: string | null;
  schedules: ServantOverviewSchedule[];
  coordinatorSectors: CoordinatorSector[];
  /** Aba aberta ao entrar. Vem de `?aba=` na URL, lida pela página. */
  initialTab?: ServantTab;
}

export default function ServantShell({ name, sectorName, color, icon, schedules, coordinatorSectors, initialTab }: ServantShellProps) {
  // Só o estado inicial vem de fora; trocar de aba depois é estado local.
  const [tab, setTab] = useState<ServantTab>(initialTab ?? "calendar");
  const tabs = getServantTabs(coordinatorSectors.length > 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      <ServantSidebar tabs={tabs} tab={tab} onTabChange={setTab} name={name} sectorName={sectorName} color={color} icon={icon} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <header className="glass servant-header servant-header-mobile-row" style={{ padding: "1rem 1.25rem", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image src="/logo-mark.png" alt="" width={28} height={28} style={{ borderRadius: "7px" }} />
            <span style={{ fontFamily: "var(--font-logo)", fontWeight: 400, fontSize: "1.5rem", color: "var(--primary)", letterSpacing: "1px" }}>ScaleFlow</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <NotificationBell />
            <ServantProfileMenu name={name} sectorName={sectorName} color={color} icon={icon} />
          </div>
        </header>

        <main style={{ padding: "2rem 1.5rem" }}>
          <ServantHome schedules={schedules} coordinatorSectors={coordinatorSectors} tab={tab} onTabChange={setTab} />
        </main>
      </div>
    </div>
  );
}
