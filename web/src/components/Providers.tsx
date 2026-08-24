"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export type Theme = "dark" | "light" | "amada";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    setTimeout(() => {
      if (savedTheme) {
        setThemeState(savedTheme);
      }
      setMounted(true);
    }, 0);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <SessionProvider>
        <ThemeSync theme={theme} mounted={mounted} />
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Aplica o tema no <html> e garante que "amada" (exclusivo do servo) nunca
 * fique de pé para outro papel — o mesmo navegador pode logar como servo e
 * depois como admin/líder, e o valor salvo em localStorage não sabe disso.
 * Fica dentro do SessionProvider por precisar de useSession.
 */
function ThemeSync({ theme, mounted }: { theme: Theme; mounted: boolean }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!mounted) return;
    const isServant = session?.user.role === "servant";
    const effective: Theme = theme === "amada" && status === "authenticated" && !isServant ? "dark" : theme;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "amada");
    root.classList.add(effective);
    // colorScheme só entende light/dark — "amada" é um tema claro para
    // efeito de scrollbar e controles nativos do navegador.
    root.style.colorScheme = effective === "dark" ? "dark" : "light";
  }, [theme, mounted, session, status]);

  return null;
}
