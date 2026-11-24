"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Download,
  EyeOff,
  Link2,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";

const STORAGE_KEY = "scaleflow:whats-new:v2026-11-pwa-google-notif";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface WhatsNewModalProps {
  role: "admin" | "leader" | "servant";
  onOpenNotifications?: () => void;
  onConnectGoogleHref?: string;
}

export default function WhatsNewModal({
  role,
  onOpenNotifications,
  onConnectGoogleHref = "/api/google/connect",
}: WhatsNewModalProps) {
  const [open, setOpen] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<"ios" | "android">("ios");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Detecta automaticamente iOS vs Android para já deixar a aba certa aberta
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("android")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInstallPlatform("android");
      }
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallPlatform("android");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        const timer = window.setTimeout(() => setOpen(true), 350);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // ignora erro de localStorage
    }
  }, []);

  const handleCloseTemporary = () => {
    setOpen(false);
  };

  const handleDontShowAgain = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignora erro de localStorage
    }
    setOpen(false);
  };

  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!open || typeof document === "undefined") return null;

  const isServant = role === "servant";

  const cards = [
    {
      id: "google",
      badge: "Novo · Google Agenda & Login",
      icon: Calendar,
      title: "Suas escalas direto na sua Google Agenda",
      description:
        "Vincule sua conta Google nas Configurações para entrar com 1 clique e sincronizar automaticamente todos os dias em que você estiver escalado(a) com a sua Google Agenda.",
      howTo: isServant
        ? "Como fazer: toque na sua foto de perfil (canto superior no celular ou rodapé da barra lateral no PC) › Configurações › Google & Google Agenda."
        : "Como fazer: abra Configurações na barra lateral › seção Google & Google Agenda › Conectar com o Google.",
      pointerLabel: isServant
        ? "↗ No seu Avatar de Perfil › Configurações"
        : "↙ No menu Configurações da barra lateral",
      actionLabel: "Conectar conta Google agora",
      onAction: () => {
        window.location.href = onConnectGoogleHref;
      },
    },
    ...(isServant
      ? [
          {
            id: "notifications",
            badge: "Novo · Central de Avisos & Push",
            icon: Bell,
            title: "Página de Notificações igual ao WhatsApp",
            description:
              "Veja todas as suas notificações de escalas abertas, confirmações e lembretes com versículo bíblico e contador de não lidas — além de receber alertas mesmo com a tela do celular apagada.",
            howTo:
              "Como fazer: toque no ícone do sino (com o número de mensagens não vistas) ao lado da sua foto de perfil e do botão de trocas.",
            pointerLabel: "↗ Ícone do Sino ao lado do seu Perfil e do botão de Trocas",
            actionLabel: "Abrir minhas notificações",
            onAction: () => {
              setOpen(false);
              onOpenNotifications?.();
            },
          },
        ]
      : []),
    {
      id: "public-links",
      badge: "Novo · Quadro Público",
      icon: CalendarRange,
      title: "Links públicos de visualização da escala",
      description:
        "Agora cada escala tem um link público exclusivo de visualização (separado do link de preenchimento) e um Link Geral do Mês com todos os ministérios, setores e filtro rápido por nome do servo.",
      howTo: isServant
        ? "Como usar: ao abrir o link compartilhado pelo seu líder, toque no seu nome para destacar seus dias no calendário!"
        : "Como fazer: em Escalas, clique em 'Link Geral do Mês' na barra superior ou abra o olho (Ver detalhes) de uma escala e clique em 'Link de Visualização'.",
      pointerLabel: isServant
        ? "★ Filtro rápido com a sua cor no calendário"
        : "↗ Em Escalas › Link Geral do Mês ou Ver detalhes (👁)",
    },
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4"
        onClick={handleCloseTemporary}
      >
        {/* Indicador flutuante apontando para a região do perfil / sino */}
        {isServant && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            }}
            className="pointer-events-none fixed top-3 right-3 z-50 hidden items-center gap-2 rounded-full border border-primary bg-card px-3.5 py-1.5 text-xs font-semibold text-primary shadow-lg sm:flex"
          >
            <span>Notificações 🔔 e Perfil ⚙️ ficam ao lado do botão de trocas</span>
            <ArrowUpRight size={15} />
          </motion.div>
        )}

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="card glass flex max-h-[90dvh] w-full max-w-2xl min-w-0 flex-col overflow-hidden p-4 sm:p-6"
        >
          {/* Cabeçalho */}
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
              >
                <Sparkles size={22} />
              </motion.div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                  Novidades no ScaleFlow
                </span>
                <h2 className="text-lg font-bold sm:text-xl">
                  Veja o que chegou para facilitar sua escala
                </h2>
              </div>
            </div>
            <CloseButton onClick={handleCloseTemporary} />
          </div>

          {/* Lista de Cards com animação de entrada em cascata (stagger) */}
          <div className="-mr-2 grid min-h-0 flex-[1_1_auto] grid-cols-1 gap-3.5 overflow-y-auto pr-2 sm:-mr-3 sm:pr-3">
            {/* Card especial de Tutorial de Instalação do App (iOS & Android) */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{
                delay: 0.05,
                type: "spring",
                stiffness: 280,
                damping: 24,
              }}
              className="rounded-xl border border-primary/35 bg-primary/5 p-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Smartphone size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground uppercase">
                      App no Celular · iOS &amp; Android
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-primary">
                      Essencial para alertas na tela bloqueada
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground sm:text-base">
                    Como instalar o aplicativo ScaleFlow no seu celular
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    O ScaleFlow funciona como um aplicativo nativo na sua Tela de Início, sem ocupar memória e com notificações em tela bloqueada:
                  </p>

                  {/* Seletor iPhone (iOS) vs Android */}
                  <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setInstallPlatform("ios")}
                      className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                      style={{
                        background:
                          installPlatform === "ios" ? "var(--primary)" : "transparent",
                        color:
                          installPlatform === "ios"
                            ? "var(--primary-foreground)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      iPhone (iOS / Safari)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallPlatform("android")}
                      className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                      style={{
                        background:
                          installPlatform === "android"
                            ? "var(--primary)"
                            : "transparent",
                        color:
                          installPlatform === "android"
                            ? "var(--primary-foreground)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      Android (Chrome)
                    </button>
                  </div>

                  {installPlatform === "ios" ? (
                    <ol className="mt-3 grid gap-2 rounded-lg border border-border bg-card/90 p-3 text-xs text-foreground">
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          1
                        </span>
                        <span>
                          Abra o ScaleFlow pelo navegador <strong>Safari</strong> no iPhone.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          2
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          Toque no ícone de <strong>Compartilhar</strong>
                          <Share size={13} className="inline text-primary" /> na barra inferior do Safari.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          3
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          Role para baixo e escolha <strong>Adicionar à Tela de Início</strong>
                          <PlusSquare size={13} className="inline text-primary" /> › <strong>Adicionar</strong>.
                        </span>
                      </li>
                    </ol>
                  ) : (
                    <ol className="mt-3 grid gap-2 rounded-lg border border-border bg-card/90 p-3 text-xs text-foreground">
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          1
                        </span>
                        <span>
                          Abra o ScaleFlow pelo <strong>Google Chrome</strong> no Android.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          2
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          Toque nos <strong>3 pontinhos</strong>
                          <MoreVertical size={13} className="inline text-primary" /> no canto superior direito do Chrome.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          3
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          Toque em <strong>Instalar aplicativo</strong> (ou <strong>Adicionar à tela inicial</strong>)
                          <Download size={13} className="inline text-primary" /> e confirme.
                        </span>
                      </li>
                    </ol>
                  )}

                  {deferredPrompt && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleTriggerNativeInstall}
                        className="px-3 py-1.5 text-xs"
                      >
                        <Download size={14} />
                        Instalar aplicativo agora (1 toque)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20, y: 12 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{
                    delay: 0.14 + index * 0.1,
                    type: "spring",
                    stiffness: 280,
                    damping: 24,
                  }}
                  className="rounded-xl border border-card-border bg-muted/55 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                          {card.badge}
                        </span>
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="font-mono text-[11px] font-semibold text-primary"
                        >
                          {card.pointerLabel}
                        </motion.span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground sm:text-base">
                        {card.title}
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {card.description}
                      </p>

                      <div className="mt-2.5 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs text-foreground">
                        {card.howTo}
                      </div>

                      {card.actionLabel && card.onAction && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={card.onAction}
                            className="px-3 py-1.5 text-xs"
                          >
                            <Link2 size={14} />
                            {card.actionLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Rodapé com botão de Não mostrar novamente */}
          <div className="mt-4 flex shrink-0 flex-col-reverse gap-2.5 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDontShowAgain}
              className="w-full text-xs text-muted-foreground hover:text-foreground sm:w-auto"
            >
              <EyeOff size={15} />
              Não mostrar novamente
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleCloseTemporary}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 size={16} />
              Entendi, vamos lá!
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
