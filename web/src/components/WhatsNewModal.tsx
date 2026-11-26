"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Download,
  EyeOff,
  Link2,
  MoreVertical,
  PlusSquare,
  Settings,
  Share,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";

const STORAGE_KEY = "scaleflow:whats-new:v2026-11-ai-pwa-v2";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface WhatsNewModalProps {
  role: "admin" | "leader" | "servant";
  onOpenNotifications?: () => void;
  onOpenAssistant?: () => void;
  onOpenSettings?: () => void;
  onConnectGoogleHref?: string;
}

export default function WhatsNewModal({
  role,
  onOpenNotifications,
  onOpenAssistant,
  onOpenSettings,
  onConnectGoogleHref = "/api/google/connect",
}: WhatsNewModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Passo 0 = Card dedicado de instalação do App (Android & iPhone) ANTES das novidades
  // Passo 1 = Showcase moderno e animado das Novidades (incluindo IA configurável)
  const [stage, setStage] = useState<"install" | "news">("install");
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
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
        const timer = window.setTimeout(() => setOpen(true), 320);
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

  const newsItems = [
    {
      id: "ai-assistant",
      badge: "Destaque · Inteligência Artificial",
      icon: Bot,
      title: "Assistente de IA que você personaliza nas Configurações",
      subtitle: "Mude o nome e o jeito de falar da IA com você",
      description:
        "O ScaleFlow conta com uma Assistente Ministerial de IA integrada para consultar escalas, organizar cultos e tirar dúvidas conversando naturalmente.",
      highlights: [
        "Nas Configurações › Assistente Ministerial (IA), você escolhe como quer chamar a assistente (ou usa o nome padrão da igreja).",
        "Mude a personalidade e o tom das respostas para você: Acolhedora e calorosa, Equilibrada ou Direta e concisa.",
        ...(role === "admin"
          ? [
              "Como Administrador, você também escolhe o provedor de IA da igreja (Gemini, Claude, OpenAI, Groq, Grok ou OpenRouter) e o tom padrão!",
            ]
          : []),
      ],
      pointerLabel: isServant
        ? "↗ Avatar de Perfil › Configurações › Assistente Ministerial (IA)"
        : "↙ Barra lateral › Assistente IA e Configurações",
      primaryAction: {
        label: "Conversar com a IA agora",
        icon: Sparkles,
        onClick: () => {
          setOpen(false);
          if (onOpenAssistant) {
            onOpenAssistant();
          } else {
            router.push(isServant ? "/servant?aba=assistant" : "/admin/assistant");
          }
        },
      },
      secondaryAction: onOpenSettings
        ? {
            label: "Personalizar IA nas Configurações",
            icon: SlidersHorizontal,
            onClick: () => {
              setOpen(false);
              onOpenSettings();
            },
          }
        : !isServant
          ? {
              label: "Configurar IA",
              icon: Settings,
              onClick: () => {
                setOpen(false);
                router.push("/admin/settings");
              },
            }
          : undefined,
    },
    {
      id: "google-calendar",
      badge: "Novo · Google Agenda & Login Rápido",
      icon: Calendar,
      title: "Login com Google, Telefone e Sincronização com Google Agenda",
      subtitle: "Seus dias escalados aparecem sozinhos na agenda do seu celular",
      description:
        "Conecte sua conta Google nas Configurações para entrar com 1 clique e sincronizar automaticamente todas as datas em que você estiver escalado(a) direto na sua Google Agenda.",
      highlights: [
        "Ao ser escalado(a) ou trocar de dia, o evento é criado ou atualizado automaticamente na sua Google Agenda.",
        "Agora você também pode fazer login digitando apenas o seu número de telefone (9 dígitos, sem 55 e sem DDD)!",
        "Coloque o Widget do Google Agenda na tela inicial do seu celular para ver sempre seu próximo culto.",
      ],
      pointerLabel: isServant
        ? "↗ Avatar de Perfil › Configurações › Google & Google Agenda"
        : "↙ Menu Configurações › Google & Google Agenda",
      primaryAction: {
        label: "Conectar conta Google agora",
        icon: Link2,
        onClick: () => {
          window.location.href = onConnectGoogleHref;
        },
      },
    },
    ...(isServant
      ? [
          {
            id: "notifications",
            badge: "Novo · Central de Avisos & Web Push",
            icon: Bell,
            title: "Notificações estilo WhatsApp & Tela Bloqueada",
            subtitle: "Veja o título, a prévia e toque para ler a mensagem completa com versículo",
            description:
              "Ao lado da sua foto de perfil e do botão de trocas, agora fica o ícone da sua página de Notificações com o contador exato de mensagens não vistas.",
            highlights: [
              "Lista igual ao WhatsApp: mostra o título e o início da mensagem; ao clicar, abre a notificação completa com versículo bíblico.",
              "Com o Web Push ativado, os avisos de nova escala aberta e confirmação chegam mesmo com a tela do celular apagada!",
            ],
            pointerLabel: "↗ Ícone do Sino 🔔 ao lado do seu Perfil e do botão de Trocas",
            primaryAction: {
              label: "Abrir minhas notificações",
              icon: Bell,
              onClick: () => {
                setOpen(false);
                onOpenNotifications?.();
              },
            },
          },
        ]
      : []),
    {
      id: "public-links",
      badge: "Novo · Quadro Público do Mês",
      icon: CalendarRange,
      title: "Links Públicos de Visualização da Escala e do Mês",
      subtitle: "Calendário interativo e lista completa sem precisar de login",
      description:
        "Compartilhe a escala pronta com a equipe em modo somente leitura — separado do link de preenchimento de disponibilidade.",
      highlights: [
        "Dentro do olho (Ver detalhes) de cada escala, use o botão 'Link de Visualização'.",
        "Na lista de Escalas, use 'Link Geral do Mês' para compartilhar todas as escalas de todos os ministérios e setores do mês.",
        "Qualquer servo pode tocar no próprio nome na página pública para destacar seus dias no calendário!",
      ],
      pointerLabel: isServant
        ? "★ Toque no seu nome no quadro público para filtrar seus dias"
        : "↗ Em Escalas › Link Geral do Mês ou Ver detalhes (👁)",
    },
  ];

  const currentNews = newsItems[activeNewsIndex] ?? newsItems[0];
  const CurrentNewsIcon = currentNews.icon;

  const goToNewsSlide = (nextIndex: number) => {
    setDirection(nextIndex > activeNewsIndex ? 1 : -1);
    setActiveNewsIndex(nextIndex);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4"
        onClick={handleCloseTemporary}
      >
        {/* Indicador flutuante apontando para os ícones reais no topo */}
        {isServant && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.35 },
              y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            }}
            className="pointer-events-none fixed top-3 right-3 z-50 hidden items-center gap-2 rounded-full border border-primary bg-card px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xl sm:flex"
          >
            <span>Notificações 🔔 e Perfil ⚙️ ficam ao lado do botão de trocas</span>
            <ArrowUpRight size={15} />
          </motion.div>
        )}

        <motion.div
          layout
          initial={{ scale: 0.9, opacity: 0, y: 28 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="card glass relative flex max-h-[92dvh] w-full max-w-2xl min-w-0 flex-col overflow-hidden p-4 sm:p-6"
        >
          {/* Brilho ambiente decorativo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/15 blur-3xl"
          />

          {/* Topo com seletor de etapa: 1. Instalar App (Antes das novidades) -> 2. Novidades */}
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/70 p-1">
              <button
                type="button"
                onClick={() => setStage("install")}
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  color:
                    stage === "install"
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {stage === "install" && (
                  <motion.span
                    layoutId="whatsNewStagePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                )}
                <Smartphone size={13} className="relative z-10" />
                <span className="relative z-10">1. Instalar o App</span>
              </button>

              <button
                type="button"
                onClick={() => setStage("news")}
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  color:
                    stage === "news"
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {stage === "news" && (
                  <motion.span
                    layoutId="whatsNewStagePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                )}
                <Sparkles size={13} className="relative z-10" />
                <span className="relative z-10">
                  2. Novidades ({newsItems.length})
                </span>
              </button>
            </div>

            <CloseButton onClick={handleCloseTemporary} />
          </div>

          {/* CONTEÚDO PRINCIPAL ANIMADO */}
          <div className="-mr-2 min-h-0 flex-[1_1_auto] overflow-x-hidden overflow-y-auto pr-2 sm:-mr-3 sm:pr-3">
            <AnimatePresence mode="wait">
              {stage === "install" ? (
                /* ==================== ETAPA 1: CARD ESPECÍFICO DE INSTALAÇÃO (ANDROID & IPHONE) ==================== */
                <motion.div
                  key="stage-install"
                  initial={{ opacity: 0, x: -28, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -28, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner"
                    >
                      <Smartphone size={24} />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                        Passo recomendado antes de começar
                      </span>
                      <h2 className="mt-1 text-lg font-bold sm:text-xl">
                        Instale o ScaleFlow na tela inicial do seu celular
                      </h2>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Tenha acesso em 1 toque como aplicativo nativo e receba alertas de escala na tela bloqueada — sem ocupar a memória do aparelho:
                      </p>
                    </div>
                  </div>

                  {/* Dois cards lado a lado: Android e iPhone */}
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {/* Card Android */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, type: "spring", stiffness: 280, damping: 24 }}
                      className="flex flex-col justify-between rounded-2xl border border-card-border bg-muted/60 p-4"
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                            No Android (Chrome)
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            3 passos
                          </span>
                        </div>

                        <ol className="space-y-2.5 text-xs leading-relaxed text-foreground">
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              1
                            </span>
                            <span>
                              Abra este site pelo navegador <strong>Google Chrome</strong>.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              2
                            </span>
                            <span>
                              Toque nos <strong>3 pontinhos</strong>{" "}
                              <MoreVertical size={13} className="inline text-primary" /> no canto superior direito.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              3
                            </span>
                            <span>
                              Toque em <strong>Instalar aplicativo</strong> (ou{" "}
                              <strong>Adicionar à tela inicial</strong>){" "}
                              <Download size={13} className="inline text-primary" /> e confirme.
                            </span>
                          </li>
                        </ol>
                      </div>

                      {deferredPrompt && (
                        <div className="mt-4 border-t border-border pt-3">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleTriggerNativeInstall}
                            className="w-full py-2 text-xs"
                          >
                            <Download size={14} />
                            Instalar no Android agora (1 toque)
                          </Button>
                        </div>
                      )}
                    </motion.div>

                    {/* Card iPhone (iOS) */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16, type: "spring", stiffness: 280, damping: 24 }}
                      className="flex flex-col justify-between rounded-2xl border border-card-border bg-muted/60 p-4"
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                            No iPhone (Safari / iOS)
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            3 passos
                          </span>
                        </div>

                        <ol className="space-y-2.5 text-xs leading-relaxed text-foreground">
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              1
                            </span>
                            <span>
                              Abra este site pelo navegador <strong>Safari</strong> no iPhone.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              2
                            </span>
                            <span>
                              Toque no botão <strong>Compartilhar</strong>{" "}
                              <Share size={13} className="inline text-primary" /> na barra inferior.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                              3
                            </span>
                            <span>
                              Role o menu e toque em{" "}
                              <strong>Adicionar à Tela de Início</strong>{" "}
                              <PlusSquare size={13} className="inline text-primary" /> ›{" "}
                              <strong>Adicionar</strong>.
                            </span>
                          </li>
                        </ol>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                /* ==================== ETAPA 2: CARROSSEL MODERNO DAS NOVIDADES ==================== */
                <motion.div
                  key="stage-news"
                  initial={{ opacity: 0, x: 28, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 28, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="space-y-4"
                >
                  {/* Barra de pílulas das novidades */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {newsItems.map((item, idx) => {
                        const active = idx === activeNewsIndex;
                        const TabIcon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => goToNewsSlide(idx)}
                            className="relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                            style={{
                              borderColor: active
                                ? "var(--primary)"
                                : "var(--border)",
                              background: active
                                ? "color-mix(in oklab, var(--primary) 16%, var(--card))"
                                : "var(--card)",
                              color: active
                                ? "var(--primary)"
                                : "var(--muted-foreground)",
                            }}
                          >
                            <TabIcon size={13} />
                            <span>
                              {idx + 1}/{newsItems.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <motion.span
                      key={currentNews.pointerLabel}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: [0, 4, 0] }}
                      transition={{
                        opacity: { duration: 0.25 },
                        x: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                      }}
                      className="font-mono text-[11px] font-semibold text-primary"
                    >
                      {currentNews.pointerLabel}
                    </motion.span>
                  </div>

                  {/* Card da novidade ativa com transição suave spring */}
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentNews.id}
                      custom={direction}
                      initial={{ opacity: 0, x: direction * 36, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: direction * -36, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="rounded-2xl border border-primary/30 bg-muted/60 p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <motion.div
                          initial={{ scale: 0.7, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 340, damping: 18 }}
                          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md"
                        >
                          <CurrentNewsIcon size={24} />
                        </motion.div>

                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                            {currentNews.badge}
                          </span>
                          <h3 className="mt-1 text-base font-bold text-foreground sm:text-lg">
                            {currentNews.title}
                          </h3>
                          <p className="text-xs font-medium text-primary">
                            {currentNews.subtitle}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {currentNews.description}
                      </p>

                      <ul className="mt-3.5 space-y-2 rounded-xl border border-border bg-card/85 p-3.5 text-xs leading-relaxed text-foreground">
                        {currentNews.highlights.map((h, i) => (
                          <motion.li
                            key={h}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06 + i * 0.07 }}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle2
                              size={15}
                              className="mt-0.5 shrink-0 text-primary"
                            />
                            <span>{h}</span>
                          </motion.li>
                        ))}
                      </ul>

                      {(currentNews.primaryAction || currentNews.secondaryAction) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          {currentNews.primaryAction && (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={currentNews.primaryAction.onClick}
                              className="px-3.5 py-2 text-xs"
                            >
                              <currentNews.primaryAction.icon size={15} />
                              {currentNews.primaryAction.label}
                            </Button>
                          )}
                          {currentNews.secondaryAction && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={currentNews.secondaryAction.onClick}
                              className="px-3.5 py-2 text-xs"
                            >
                              <currentNews.secondaryAction.icon size={15} />
                              {currentNews.secondaryAction.label}
                            </Button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rodapé com navegação entre Instalar App / Novidades e Não mostrar novamente */}
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

            <div className="flex flex-wrap items-center justify-end gap-2">
              {stage === "install" ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setStage("news");
                    setActiveNewsIndex(0);
                  }}
                  className="w-full sm:w-auto"
                >
                  <span>Ver as Novidades</span>
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (activeNewsIndex > 0) {
                        goToNewsSlide(activeNewsIndex - 1);
                      } else {
                        setStage("install");
                      }
                    }}
                    className="px-3 py-2 text-xs"
                  >
                    <ArrowLeft size={15} />
                    Anterior
                  </Button>

                  {activeNewsIndex < newsItems.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => goToNewsSlide(activeNewsIndex + 1)}
                    >
                      <span>Próxima novidade</span>
                      <ArrowRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCloseTemporary}
                    >
                      <CheckCircle2 size={16} />
                      Começar a usar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
