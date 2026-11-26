"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Download,
  PlusSquare,
  Share,
  Sparkles,
  X,
} from "lucide-react";
import type { GlobalInstallPromptEvent } from "@/components/Providers";
import { useToast } from "@/components/Toast";

const STORAGE_KEY = "scaleflow:whats-new:v2026-11-editorial-v3";

interface WhatsNewModalProps {
  role: "admin" | "leader" | "servant";
  onOpenNotifications?: () => void;
  onOpenAssistant?: () => void;
  onOpenSettings?: () => void;
  onConnectGoogleHref?: string;
}

const AI_PREVIEW_STYLES = {
  warm: {
    label: "Acolhedora",
    sample:
      "“Paz, irmão! Vi que você está confirmado no domingo às 19h. Que culto abençoado vamos ter!”",
  },
  balanced: {
    label: "Equilibrada",
    sample:
      "“Olá! Sua próxima escala confirmada é neste domingo, às 19:00, na equipe de Mídia.”",
  },
  direct: {
    label: "Direta",
    sample: "“Próxima escala: Domingo, 19:00 · Ministério de Comunicação.”",
  },
} as const;

export default function WhatsNewModal({
  role,
  onOpenNotifications,
  onOpenAssistant,
  onConnectGoogleHref = "/api/google/connect",
}: WhatsNewModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  // 0 = Tela dedicada de Instalar App (1 botão que aperta e instala)
  // 1 = IA Personalizável nas Configurações
  // 2 = Google Agenda + Login com Google / Telefone
  // 3 = Notificações estilo WhatsApp & Quadro Público do Mês
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [installPrompt, setInstallPrompt] =
    useState<GlobalInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [aiTonePreview, setAiTonePreview] =
    useState<keyof typeof AI_PREVIEW_STYLES>("warm");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(iosDevice);

    // Se já estiver rodando como PWA instalado na tela inicial, pula a tela 0 de instalação
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      setStep(1);
    }

    if (window.__scaleflowInstallPrompt) {
      setInstallPrompt(window.__scaleflowInstallPrompt);
    }

    const onReady = () => {
      if (window.__scaleflowInstallPrompt) {
        setInstallPrompt(window.__scaleflowInstallPrompt);
      }
    };

    window.addEventListener("scaleflow:install-ready", onReady);
    return () => window.removeEventListener("scaleflow:install-ready", onReady);
  }, []);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        const timer = window.setTimeout(() => setOpen(true), 280);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // ignora erro de localStorage
    }
  }, []);

  const handleCloseTemporary = () => setOpen(false);

  const handleDontShowAgain = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignora
    }
    setOpen(false);
  };

  const goNext = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const handleOneClickInstall = async () => {
    if (installPrompt) {
      setInstalling(true);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        window.__scaleflowInstallPrompt = null;
        setInstallPrompt(null);
        if (choice.outcome === "accepted") {
          showToast("Aplicativo instalado na sua tela inicial!", "success");
          goNext(1);
        }
      } finally {
        setInstalling(false);
      }
      return;
    }

    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    showToast(
      "No menu do seu navegador (⋮), toque em 'Instalar aplicativo' para adicionar à tela inicial.",
      "success",
    );
    goNext(1);
  };

  if (!open || typeof document === "undefined") return null;

  const isServant = role === "servant";
  const totalSteps = 4;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
        onClick={handleCloseTemporary}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-3xl border border-card-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        >
          {/* Botão discreto de fechar no canto */}
          <button
            type="button"
            onClick={handleCloseTemporary}
            aria-label="Fechar"
            className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-background/60 text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>

          <AnimatePresence mode="wait" custom={direction}>
            {/* ==================== TELA 0: PÁGINA DE INSTALAÇÃO EM 1 CLIQUE ==================== */}
            {step === 0 && (
              <motion.div
                key="screen-install"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex flex-col overflow-y-auto"
              >
                {/* Palco Visual Hero */}
                <div className="relative flex flex-col items-center justify-center overflow-hidden bg-background px-6 pt-12 pb-8 text-center">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(249,115,22,0.24),transparent_68%)]"
                  />

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative"
                  >
                    <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-xl" />
                    <Image
                      src="/logo-mark.png"
                      alt="ScaleFlow"
                      width={84}
                      height={84}
                      className="relative rounded-2xl shadow-2xl"
                    />
                  </motion.div>

                  <span className="mt-5 font-mono text-[11px] tracking-widest text-primary uppercase">
                    Aplicativo Oficial
                  </span>

                  <h2 className="mt-2 font-display text-3xl leading-[1.08] font-normal tracking-tight text-foreground">
                    Tenha o ScaleFlow na sua{" "}
                    <em className="text-accent italic">tela inicial.</em>
                  </h2>

                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Acesse suas escalas em 1 toque e receba avisos de culto na
                    tela bloqueada, sem ocupar a memória do celular.
                  </p>
                </div>

                {/* Área do Botão Único de Instalação */}
                <div className="flex flex-col gap-3 p-6">
                  {!showIosGuide ? (
                    <button
                      type="button"
                      disabled={installing}
                      onClick={handleOneClickInstall}
                      className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-transform active:scale-98"
                    >
                      <Download size={18} />
                      <span>
                        {installing
                          ? "Instalando..."
                          : "Instalar Aplicativo Agora"}
                      </span>
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-primary/40 bg-muted/70 p-4 text-xs leading-relaxed text-foreground"
                    >
                      <p className="mb-2 font-semibold text-primary">
                        No iPhone, confirme em 2 toques no Safari:
                      </p>
                      <p className="flex items-center gap-2">
                        <span>1. Toque em</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 font-semibold text-primary">
                          <Share size={13} /> Compartilhar
                        </span>
                        <span>na barra do Safari</span>
                      </p>
                      <p className="mt-1.5 flex items-center gap-2">
                        <span>2. Escolha</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 font-semibold text-primary">
                          <PlusSquare size={13} /> Adicionar à Tela de Início
                        </span>
                      </p>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() => goNext(1)}
                    className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>Continuar e ver as novidades</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TELA 1: ASSISTENTE DE IA PERSONALIZÁVEL ==================== */}
            {step === 1 && (
              <motion.div
                key="screen-ai"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex flex-col overflow-y-auto"
              >
                {/* Palco Visual Interativo da IA */}
                <div className="relative overflow-hidden bg-background px-6 pt-10 pb-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(249,115,22,0.2),transparent_65%)]"
                  />

                  <div className="relative rounded-2xl border border-card-border bg-card p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Assistente Cale · IA
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Toque abaixo para testar o jeito de falar:
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seletor ao vivo do tom da IA */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
                      {(
                        Object.keys(AI_PREVIEW_STYLES) as Array<
                          keyof typeof AI_PREVIEW_STYLES
                        >
                      ).map((key) => {
                        const active = aiTonePreview === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setAiTonePreview(key)}
                            className="rounded-lg py-1.5 text-[11px] font-semibold transition-all"
                            style={{
                              background: active
                                ? "var(--primary)"
                                : "transparent",
                              color: active
                                ? "var(--primary-foreground)"
                                : "var(--muted-foreground)",
                            }}
                          >
                            {AI_PREVIEW_STYLES[key].label}
                          </button>
                        );
                      })}
                    </div>

                    <motion.p
                      key={aiTonePreview}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-foreground italic"
                    >
                      {AI_PREVIEW_STYLES[aiTonePreview].sample}
                    </motion.p>
                  </div>
                </div>

                {/* Texto Editorial */}
                <div className="flex flex-col gap-3 p-6">
                  <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
                    Novidade 01 · Inteligência Artificial
                  </span>
                  <h2 className="font-display text-2xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-3xl">
                    Uma assistente de IA com o{" "}
                    <em className="text-accent italic">seu jeito.</em>
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Consulte e organize escalas conversando. Nas{" "}
                    <strong className="text-foreground">Configurações</strong>,
                    você pode mudar o <strong className="text-foreground">nome</strong>{" "}
                    da assistente e escolher a{" "}
                    <strong className="text-foreground">personalidade</strong> com
                    que ela responde para você.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (onOpenAssistant) {
                        onOpenAssistant();
                      } else {
                        router.push(
                          isServant ? "/servant?aba=assistant" : "/admin/assistant",
                        );
                      }
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Sparkles size={14} />
                    <span>Experimentar a Assistente IA agora →</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TELA 2: GOOGLE AGENDA & LOGIN RÁPIDO ==================== */}
            {step === 2 && (
              <motion.div
                key="screen-google"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex flex-col overflow-y-auto"
              >
                {/* Palco Visual do Evento na Google Agenda */}
                <div className="relative overflow-hidden bg-background px-6 pt-10 pb-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(249,115,22,0.2),transparent_65%)]"
                  />

                  <div className="relative rounded-2xl border border-card-border bg-card p-4 shadow-xl">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono uppercase">Google Agenda</span>
                      <span className="inline-flex items-center gap-1 text-success">
                        <Check size={12} /> Sincronizado
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border-l-4 border-primary bg-muted/70 p-3">
                      <p className="text-xs font-bold text-foreground">
                        ⛪ Escala: Louvor &amp; Mídia
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Domingo · 19:00 – 21:00 · Lembrete automático
                      </p>
                    </div>
                  </div>
                </div>

                {/* Texto Editorial */}
                <div className="flex flex-col gap-3 p-6">
                  <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
                    Novidade 02 · Google Agenda &amp; Login
                  </span>
                  <h2 className="font-display text-2xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-3xl">
                    Seus dias escalados direto na{" "}
                    <em className="text-accent italic">Google Agenda.</em>
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Conecte sua conta Google nas{" "}
                    <strong className="text-foreground">Configurações</strong> para
                    entrar com 1 clique (ou use apenas os 9 dígitos do seu
                    telefone!) e ter cada culto confirmado salvo automaticamente na
                    sua agenda.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = onConnectGoogleHref;
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Calendar size={14} />
                    <span>Conectar minha conta Google agora →</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TELA 3: NOTIFICAÇÕES & QUADRO PÚBLICO ==================== */}
            {step === 3 && (
              <motion.div
                key="screen-notifications"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex flex-col overflow-y-auto"
              >
                {/* Palco Visual do Sino com Contador */}
                <div className="relative overflow-hidden bg-background px-6 pt-10 pb-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(249,115,22,0.22),transparent_65%)]"
                  />

                  <div className="relative rounded-2xl border border-card-border bg-card p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Bell size={18} />
                          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            2
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Você foi escalado(a) · Dom às 19:00
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            “Sirvam uns aos outros mediante o amor.” — Gl 5:13
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Texto Editorial */}
                <div className="flex flex-col gap-3 p-6">
                  <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
                    Novidade 03 · Avisos &amp; Quadro do Mês
                  </span>
                  <h2 className="font-display text-2xl leading-[1.12] font-normal tracking-tight text-foreground sm:text-3xl">
                    Avisos no estilo WhatsApp e{" "}
                    <em className="text-accent italic">quadro público.</em>
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Toque no sino <strong className="text-foreground">🔔</strong>{" "}
                    ao lado do seu perfil para ler seus avisos completos com
                    versículo — e use o novo{" "}
                    <strong className="text-foreground">Link Geral do Mês</strong>{" "}
                    para visualizar todas as escalas da igreja com filtro rápido por
                    nome.
                  </p>

                  {isServant && onOpenNotifications && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenNotifications();
                      }}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <Bell size={14} />
                      <span>Abrir página de notificações →</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rodapé minimalista (apenas nos passos 1, 2 e 3) */}
          {step > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => goNext(step - 1)}
                  aria-label="Voltar"
                  className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleDontShowAgain}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Não mostrar novamente
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Indicadores de progresso minimalistas */}
                <div className="hidden items-center gap-1 sm:flex">
                  {[1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: step === idx ? "18px" : "6px",
                        background:
                          step === idx ? "var(--primary)" : "var(--border)",
                      }}
                    />
                  ))}
                </div>

                {step < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={() => goNext(step + 1)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                  >
                    <span>Próximo</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseTemporary}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                  >
                    <span>Começar</span>
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
