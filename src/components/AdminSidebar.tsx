"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  LogOut,
  Layers,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/Providers";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Layers, label: "Ministérios", href: "/admin/ministries" },
  { icon: Layers, label: "Setores", href: "/admin/sectors" },
  { icon: Users, label: "Servos", href: "/admin/servants" },
  { icon: Calendar, label: "Escalas", href: "/admin/schedules" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return (
    <aside className="glass" style={{ width: '280px', margin: '1rem' }} />
  );

  const sidebarWidth = isCollapsed ? '80px' : '280px';

  return (
    <aside className="glass" style={{ 
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
        justifyContent: isCollapsed ? 'center' : 'flex-start' 
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
      </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          left: '-16px',
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
          boxShadow: '-4px 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease'
        }}
      >
        {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map((item) => {
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
  );
}
