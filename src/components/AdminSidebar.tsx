"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  LogOut,
  Layers,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/Providers";
import { useAdminTopbar } from "@/components/AdminTopbarContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Layers, label: "Ministérios", href: "/admin/ministries", adminOnly: true },
  { icon: Layers, label: "Setores", href: "/admin/sectors" },
  { icon: Users, label: "Servos", href: "/admin/servants" },
  { icon: Calendar, label: "Escalas", href: "/admin/schedules" },
  { icon: CalendarDays, label: "Calendário", href: "/admin/calendar" },
];

interface AdminSidebarProps {
  role: "admin" | "leader" | "servant";
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { action } = useAdminTopbar();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleMenuItems = menuItems
    .filter(item => !item.adminOnly || role === "admin")
    .map(item => item.href === "/admin" && role === "leader" ? { ...item, label: "Geral" } : item);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Fecha o menu mobile automaticamente ao trocar de página.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return (
    <aside className="glass" style={{ width: '280px', margin: '1rem' }} />
  );

  const sidebarWidth = isCollapsed ? '80px' : '280px';

  return (
    <>
      <div className="admin-mobile-topbar">
        <button
          onClick={() => setMobileOpen(true)}
          className="btn btn-ghost"
          style={{ padding: '0.5rem' }}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        {action}
      </div>

      <div
        className={`admin-sidebar-backdrop ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`glass admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{
        width: sidebarWidth,
        height: 'calc(100vh - 2rem)',
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '1rem 0.5rem' : '1.5rem',
        position: 'sticky',
        top: '1rem',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div className="flex" style={{
          marginBottom: '2.5rem',
          padding: '0 0.5rem',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: isCollapsed ? '1.5rem' : '1.75rem',
            fontWeight: 400,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-logo)',
            color: 'var(--primary)',
            letterSpacing: '1px'
          }}>
            {isCollapsed ? 'S' : 'ScaleFlow'}
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="btn btn-ghost admin-sidebar-mobile-close"
            style={{ padding: '0.375rem', borderRadius: '50%' }}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="admin-collapse-toggle"
          style={{
            position: 'absolute',
            right: '-16px',
            top: '4.5rem',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            color: 'white',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btn ${isActive ? 'active' : ''}`}
                style={{
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  background: 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  borderRadius: '0',
                  padding: isCollapsed ? '0.75rem 0' : '0.625rem 1rem',
                  transition: 'all 0.2s',
                  overflow: 'hidden'
                }}
              >
                <item.icon size={20} style={{ minWidth: '20px' }} />
                {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: isCollapsed ? 'center' : 'stretch'
        }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="btn btn-ghost"
            style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', padding: isCollapsed ? '0.75rem 0' : '0.625rem 0.5rem' }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
          </button>

          <button
            onClick={() => signOut()}
            className="btn btn-ghost"
            style={{
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: '100%',
              color: '#ef4444',
              padding: isCollapsed ? '0.75rem 0' : '0.625rem 0.5rem'
            }}
          >
            <LogOut size={20} />
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
