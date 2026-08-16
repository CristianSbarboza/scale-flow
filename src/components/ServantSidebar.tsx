"use client";

import type { ServantTab, ServantTabItem } from "@/components/ServantHome";
import ServantProfileMenu from "@/components/ServantProfileMenu";
import NotificationBell from "@/components/NotificationBell";
import NavLink from "@/components/ui/NavLink";

interface ServantSidebarProps {
  tabs: ServantTabItem[];
  tab: ServantTab;
  onTabChange: (tab: ServantTab) => void;
  name: string;
  sectorName: string;
  color: string | null;
}

export default function ServantSidebar({ tabs, tab, onTabChange, name, sectorName, color }: ServantSidebarProps) {
  return (
    <aside className="glass servant-sidebar">
      <div style={{ marginBottom: "2.5rem", padding: "0 0.5rem" }}>
        <span style={{
          fontSize: "1.75rem",
          fontWeight: 400,
          whiteSpace: "nowrap",
          fontFamily: "var(--font-logo)",
          color: "var(--primary)",
          letterSpacing: "1px",
        }}>
          ScaleFlow
        </span>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {tabs.map((t) => {
          const isActive = tab === t.value;
          return (
            <NavLink
              key={t.value}
              onClick={() => onTabChange(t.value)}
              icon={t.icon}
              active={isActive}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>

      <div style={{
        marginTop: "auto",
        paddingTop: "1rem",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sectorName}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <NotificationBell placement="top" />
          <ServantProfileMenu name={name} sectorName={sectorName} color={color} />
        </div>
      </div>
    </aside>
  );
}
