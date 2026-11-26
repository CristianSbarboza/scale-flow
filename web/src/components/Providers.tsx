"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export type Theme = "dark" | "light" | "jess";

export interface GlobalInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __scaleflowInstallPrompt?: GlobalInstallPromptEvent | null;
  }
}

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
    const savedTheme = localStorage.getItem("theme") as Theme | "amada" | null;
    setTimeout(() => {
      if (savedTheme) {
        setThemeState(savedTheme === "amada" ? "jess" : savedTheme);
      }
      setMounted(true);
    }, 0);

    // Registra o Service Worker cedo para que o navegador habilite o prompt de
    // instalação PWA ("beforeinstallprompt") em 1 clique.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__scaleflowInstallPrompt = e as GlobalInstallPromptEvent;
      window.dispatchEvent(new Event("scaleflow:install-ready"));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
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

function ThemeSync({ theme, mounted }: { theme: Theme; mounted: boolean }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!mounted) return;
    const isServant = session?.user.role === "servant";
    const effective: Theme =
      theme === "jess" && status === "authenticated" && !isServant
        ? "dark"
        : theme;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "jess");
    root.classList.add(effective);
    root.style.colorScheme = effective === "dark" ? "dark" : "light";
  }, [theme, mounted, session, status]);

  return null;
}
