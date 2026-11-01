"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Check,
  Church,
  ClipboardList,
  Copy,
  LayoutDashboard,
  LayoutGrid,
  Link as LinkIcon,
  ListChecks,
  Menu,
  Repeat,
  Send,
  Settings,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Switch from "@/components/ui/Switch";
import type { PhoneProfileId, PhoneSceneId } from "@/components/landing/landing-data";
import { cn } from "@/lib/cn";

type InternalView =
  | "admin_overview"
  | "admin_ministries"
  | "admin_settings"
  | "leader_overview"
  | "leader_servants"
  | "leader_schedules"
  | "leader_ai"
  | "servant_calendar"
  | "servant_month"
  | "servant_next"
  | "servant_all"
  | "servant_ai"
  | "servant_swaps"
  | "servant_whatsapp"
  | "coordinator_manage";

const SCENE_TO_VIEW: Record<PhoneSceneId, InternalView> = {
  role_admin: "admin_overview",
  role_leader: "leader_servants",
  role_servant: "servant_calendar",
  role_coordinator: "coordinator_manage",
  moment_cale: "leader_ai",
  moment_disponibilidade: "servant_next",
  moment_escala: "leader_schedules",
  moment_trocas: "servant_swaps",
  moment_whatsapp: "servant_whatsapp",
  moment_igreja: "admin_ministries",
};

function profileOfView(view: InternalView): PhoneProfileId {
  if (view.startsWith("admin_")) return "admin";
  if (view.startsWith("leader_")) return "leader";
  if (view === "coordinator_manage") return "coordinator";
  return "servant";
}

const DEFAULT_AVAILABILITY = [true, true, false, true, true];

interface InteractivePhoneStageProps {
  activeScene: PhoneSceneId;
  onSelectScene?: (scene: PhoneSceneId) => void;
}

export default function InteractivePhoneStage({
  activeScene,
}: InteractivePhoneStageProps) {
  const [prevScene, setPrevScene] = useState<PhoneSceneId>(activeScene);
  const [view, setView] = useState<InternalView>(SCENE_TO_VIEW[activeScene]);
  // Preserva se o servo está sendo visto no modo "Coordenador" ao clicar nas abas de servo
  const [coordinatorMode, setCoordinatorMode] = useState<boolean>(
    activeScene === "role_coordinator",
  );

  if (prevScene !== activeScene) {
    setPrevScene(activeScene);
    const mapped = SCENE_TO_VIEW[activeScene];
    setView(mapped);
    setCoordinatorMode(activeScene === "role_coordinator");
  }

  const [ministryComActive, setMinistryComActive] = useState(true);
  const [lucasIsCoord, setLucasIsCoord] = useState(true);
  const [pedroActive, setPedroActive] = useState(true);
  const [caleApproved, setCaleApproved] = useState(false);
  const [availability, setAvailability] = useState<boolean[]>(DEFAULT_AVAILABILITY);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [coordPublished, setCoordPublished] = useState(true);
  const [coordSectorFilter, setCoordSectorFilter] = useState<"Fotografia" | "Transmissão">(
    "Fotografia",
  );
  const [swapAccepted, setSwapAccepted] = useState(false);
  const [phoneToast, setPhoneToast] = useState<string | null>(null);

  const notifyPhone = (message: string) => {
    setPhoneToast(message);
    window.setTimeout(() => {
      setPhoneToast((prev) => (prev === message ? null : prev));
    }, 2600);
  };

  const activeProfile: PhoneProfileId =
    coordinatorMode && (view.startsWith("servant_") || view === "coordinator_manage")
      ? "coordinator"
      : profileOfView(view);

  const switchProfile = (next: PhoneProfileId) => {
    if (next === "admin") {
      setCoordinatorMode(false);
      setView("admin_overview");
    } else if (next === "leader") {
      setCoordinatorMode(false);
      setView("leader_servants");
    } else if (next === "servant") {
      setCoordinatorMode(false);
      setView("servant_calendar");
    } else {
      setCoordinatorMode(true);
      setView("coordinator_manage");
    }
  };

  const toggleDay = (index: number) => {
    setAvailability((prev) => prev.map((v, i) => (i === index ? !v : v)));
    setAvailabilitySaved(false);
  };

  const isServantShell = activeProfile === "servant" || activeProfile === "coordinator";

  return (
    <aside
      aria-label="Simulador interativo dos perfis do ScaleFlow"
      className="flex w-full flex-col items-center"
    >
      <div className="relative mx-auto w-full max-w-88 sm:max-w-sm">
        {/* Halo atmosférico suave atrás do aparelho */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 rounded-full bg-primary/15 blur-3xl"
        />

        {/* Moldura física do celular */}
        <div className="relative mx-auto w-full rounded-4xl border-2 border-border bg-card p-2.5 shadow-2xl sm:p-3">
          <span
            aria-hidden="true"
            className="absolute top-24 -left-1 hidden h-8 w-1 rounded-l bg-border sm:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-36 -left-1 hidden h-12 w-1 rounded-l bg-border sm:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-32 -right-1 hidden h-14 w-1 rounded-r bg-border sm:block"
          />

          {/* Tela interna alta e responsiva à janela */}
          <div className="relative flex min-h-156 flex-col justify-between overflow-hidden rounded-3xl border border-card-border bg-background sm:min-h-172 lg:h-[min(45rem,calc(100dvh-6.5rem))] lg:min-h-148">
            {/* TOPO DO APARELHO: Status Bar + Seletor de Perfil + Header fiel ao papel */}
            <div className="shrink-0">
              <div
                aria-hidden="true"
                className="flex items-center justify-between px-5 pt-3 pb-2 font-mono text-[11px] text-muted-foreground"
              >
                <span>09:41</span>
                <span className="h-4 w-20 rounded-full bg-muted" />
                <span>5G · 100%</span>
              </div>

              {/* Seletor rápido dos 3 perfis + diferencial Coordenador */}
              <div
                role="group"
                aria-label="Alternar perfil simulado no celular"
                className="mx-3 mb-2 grid grid-cols-4 gap-1 rounded-full border border-border bg-card p-1"
              >
                {(
                  [
                    { id: "admin", label: "Admin" },
                    { id: "leader", label: "Líder" },
                    { id: "servant", label: "Servo" },
                    { id: "coordinator", label: "Coord. ★" },
                  ] as const
                ).map((item) => {
                  const selected = activeProfile === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => switchProfile(item.id)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full py-1 text-center font-mono text-[10px] font-medium transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Cabeçalho real: AdminSidebar (/admin) vs ServantShell (/servant) */}
              {!isServantShell ? (
                <div className="flex items-center justify-between border-y border-border/70 bg-card/50 px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                      <Menu size={14} />
                    </span>
                    <div>
                      <span className="block font-logo text-xs leading-none tracking-wide text-primary">
                        ScaleFlow
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {activeProfile === "admin"
                          ? "Igreja Vida · Admin"
                          : "Comunicação · Líder"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-medium text-primary">
                    {activeProfile === "admin" ? "Toda a igreja" : "1 ministério"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between border-y border-border/70 bg-card/50 px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-card-border bg-card font-mono text-[10px] font-semibold text-primary">
                      S†F
                    </span>
                    <span className="font-logo text-sm tracking-wide text-primary">
                      ScaleFlow
                    </span>
                  </div>

                  {/* Sino real (NotificationBell) + Avatar do Servo */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setView("servant_swaps")}
                      aria-label="Ver pedidos de troca no sino de notificações"
                      className={cn(
                        "relative inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                        view === "servant_swaps"
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40",
                      )}
                    >
                      <Bell size={13} />
                      {!swapAccepted && (
                        <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </button>
                    <span
                      title="Lucas Alves"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                    >
                      LA
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CORPO INTERATIVO DO APARELHO */}
            <div className="relative flex flex-1 flex-col overflow-y-auto px-3.5 py-3.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeProfile}-${view}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex flex-1 flex-col justify-between gap-3"
                >
                  {/* ==================== ADMIN: VISÃO GERAL ==================== */}
                  {view === "admin_overview" && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Painel Administrativo
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Igreja Vida · Visão Geral
                          </p>
                        </div>

                        {/* StatsRule real do Admin (inclui Ministérios) */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Ministérios", value: "4", icon: Church },
                            { label: "Setores", value: "11", icon: LayoutGrid },
                            { label: "Servos", value: "64", icon: Users },
                            { label: "Escalas Ativas", value: "9", icon: Calendar },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="rounded-xl border border-card-border bg-card px-3 py-2"
                            >
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-[10px] font-medium">
                                  {stat.label}
                                </span>
                                <stat.icon size={12} className="text-primary" />
                              </div>
                              <p className="mt-1 text-base font-bold text-foreground">
                                {stat.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Painel Ministérios (exclusivo do Admin no AdminDashboard) */}
                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                              Ministérios da Igreja
                            </span>
                            <button
                              type="button"
                              onClick={() => setView("admin_ministries")}
                              className="font-mono text-[10px] text-primary hover:underline"
                            >
                              Gerenciar →
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  Comunicação
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Líderes: Pr. André, Camila
                                </p>
                              </div>
                              <span className="font-mono text-[10px] text-success">
                                3 setores
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  Louvor &amp; Adoração
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Líder: Pr. Marcos
                                </p>
                              </div>
                              <span className="font-mono text-[10px] text-success">
                                4 setores
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  Recepção &amp; Diaconia
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Líderes: Helena, Roberto
                                </p>
                              </div>
                              <span className="font-mono text-[10px] text-success">
                                2 setores
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("admin_ministries")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <Church size={13} />
                        Abrir Gestão de Ministérios
                      </button>
                    </>
                  )}

                  {/* ==================== ADMIN: MINISTÉRIOS ==================== */}
                  {view === "admin_ministries" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              Gestão de Ministérios
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Exclusivo do Administrador
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                            Multi-líder
                          </span>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Comunicação
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Líderes: Pr. André, Camila · 3 setores
                              </p>
                            </div>
                            <Switch
                              checked={ministryComActive}
                              onChange={(next) => {
                                setMinistryComActive(next);
                                notifyPhone(
                                  next
                                    ? "Ministério Comunicação ativado."
                                    : "Ministério pausado sem excluir dados.",
                                );
                              }}
                              label="Alternar situação do ministério Comunicação"
                            />
                          </div>
                          <p className="mt-2 border-t border-border/60 pt-2 font-mono text-[10px] text-muted-foreground">
                            Situação:{" "}
                            <strong
                              className={
                                ministryComActive ? "text-success" : "text-primary"
                              }
                            >
                              {ministryComActive
                                ? "Ativo (WhatsApp e escalas liberados)"
                                : "Desativado (histórico 100% preservado)"}
                            </strong>
                          </p>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <p className="text-xs font-semibold text-foreground">
                            Louvor &amp; Adoração
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Líder: Pr. Marcos · Vocal, Banda, Áudio, Mesa
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                              + Adicionar Líder
                            </span>
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                              4 setores ativos
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("admin_settings")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/50"
                      >
                        <Settings size={13} className="text-primary" />
                        Ver Configurações da Igreja &amp; IA
                      </button>
                    </>
                  )}

                  {/* ==================== ADMIN: CONFIGURAÇÕES ==================== */}
                  {view === "admin_settings" && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Configurações da Igreja
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Identidade e Assistente IA da comunidade
                          </p>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            Dados da Igreja (Só Admin)
                          </span>
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            Igreja Vida · @igrejavida
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Link rápido de login dos servos: /login?igreja=igrejavida
                          </p>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">
                              Assistente Cale IA
                            </span>
                            <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-[9px] text-success">
                              Conectada
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            Provedor ativo para líderes e servos
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Suporte multi-provedor (Groq, Google Gemini, OpenAI)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("admin_overview")}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-foreground px-3 text-xs font-semibold text-background"
                      >
                        Voltar para Visão Geral
                      </button>
                    </>
                  )}

                  {/* ==================== LÍDER: VISÃO GERAL ==================== */}
                  {view === "leader_overview" && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Painel — Comunicação
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Escopo filtrado no seu ministério
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Setores", value: "3" },
                            { label: "Servos", value: "22" },
                            { label: "Escalas", value: "4" },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="rounded-xl border border-card-border bg-card p-2.5 text-center"
                            >
                              <p className="text-base font-bold text-foreground">
                                {s.value}
                              </p>
                              <p className="font-mono text-[9px] text-muted-foreground uppercase">
                                {s.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <p className="mb-2 font-mono text-[10px] text-muted-foreground uppercase">
                            Setores de Comunicação
                          </p>
                          <div className="space-y-2">
                            {[
                              { name: "Fotografia", count: "8 servos · 1 coord." },
                              { name: "Transmissão", count: "8 servos · 1 coord." },
                              { name: "Projeção", count: "6 servos" },
                            ].map((sec) => (
                              <div
                                key={sec.name}
                                className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-none last:pb-0"
                              >
                                <span className="text-xs font-semibold text-foreground">
                                  {sec.name}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {sec.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("leader_servants")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        <Users size={13} />
                        Gerenciar Servos e Coordenadores
                      </button>
                    </>
                  )}

                  {/* ==================== LÍDER: SERVOS & COORDENADORES ==================== */}
                  {view === "leader_servants" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              Servos · Comunicação
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Toque na estrela para definir Coordenador
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Lucas Alves
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                @lucas.alves · Fotografia, Transmissão
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = !lucasIsCoord;
                                setLucasIsCoord(next);
                                notifyPhone(
                                  next
                                    ? "Lucas agora tem a aba Gestão!"
                                    : "Coordenação removida de Lucas.",
                                );
                              }}
                              aria-pressed={lucasIsCoord}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors",
                                lucasIsCoord
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              <Star
                                size={11}
                                fill={lucasIsCoord ? "currentColor" : "none"}
                              />
                              {lucasIsCoord ? "Coordenador" : "Tornar Coord."}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Pedro Henrique
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Projeção ·{" "}
                                {pedroActive
                                  ? "Ativo no WhatsApp"
                                  : "Desativado (pausado)"}
                              </p>
                            </div>
                            <Switch
                              checked={pedroActive}
                              onChange={(next) => {
                                setPedroActive(next);
                                notifyPhone(
                                  next
                                    ? "Pedro reativado no setor."
                                    : "Pedro pausado: WhatsApp silenciado.",
                                );
                              }}
                              label="Ativar ou desativar Pedro Henrique"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
                          Ao cadastrar um novo servo, o sistema gera uma{" "}
                          <strong className="text-foreground">
                            Senha de Primeiro Acesso
                          </strong>{" "}
                          pronta para enviar no WhatsApp.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => switchProfile("coordinator")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                      >
                        <ClipboardList size={13} />
                        Ver como fica o celular de Lucas (Coord.)
                      </button>
                    </>
                  )}

                  {/* ==================== LÍDER: ESCALAS ==================== */}
                  {view === "leader_schedules" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-card-border bg-card p-3">
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Escala Novembro · Fotografia
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              Situação: {isPublished ? "Publicada" : "Rascunho"} ·
                              Pública
                            </p>
                          </div>
                          <Switch
                            checked={isPublished}
                            onChange={(next) => {
                              setIsPublished(next);
                              notifyPhone(
                                next
                                  ? "Publicada! Servos avisados no WhatsApp."
                                  : "Voltou para rascunho.",
                              );
                            }}
                            label="Alternar publicação da escala"
                          />
                        </div>

                        <div className="space-y-2">
                          {[
                            {
                              date: "Dom 02/11 · 10:00",
                              people: "Camila Rocha, Beatriz Lima",
                              status: "4 disp.",
                            },
                            {
                              date: "Dom 02/11 · 18:30",
                              people: "Lucas Alves, Marina Costa",
                              status: "3 disp.",
                            },
                            {
                              date: "Qui 06/11 · 19:30",
                              people: "Rafael Souza",
                              status: "2 disp.",
                            },
                          ].map((row) => (
                            <div
                              key={row.date}
                              className="rounded-xl border border-card-border bg-card px-3 py-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                  {row.date}
                                </span>
                                <span className="font-mono text-[10px] text-success">
                                  {row.status}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Escalados: {row.people}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          notifyPhone("Cópia criada em rascunho para Transmissão.")
                        }
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/50"
                      >
                        <Copy size={12} className="text-primary" />
                        Duplicar escala para outro setor
                      </button>
                    </>
                  )}

                  {/* ==================== LÍDER / COORD: ASSISTENTE IA (SEM RADAR) ==================== */}
                  {view === "leader_ai" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Assistente Cale · IA
                          </span>
                          <span className="rounded-full bg-secondary/15 px-2 py-0.5 font-mono text-[10px] text-secondary">
                            1 escala por vez
                          </span>
                        </div>

                        <div className="ml-6 rounded-2xl rounded-br-sm bg-primary px-3 py-2.5 text-xs leading-relaxed text-primary-foreground">
                          Crie a escala de Fotografia de novembro: dom 10h e
                          18h30, qui 19h30, sem o último domingo de manhã.
                        </div>

                        {/* Cartão estático limpo, sem borda/radar girando */}
                        <div
                          className={cn(
                            "rounded-xl border bg-card p-3.5 transition-colors",
                            caleApproved
                              ? "border-success/40"
                              : "border-primary/40",
                          )}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Sparkles size={13} className="text-primary" />
                              Novembro · Fotografia
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[10px]",
                                caleApproved
                                  ? "bg-success/15 text-success"
                                  : "bg-primary/15 text-primary",
                              )}
                            >
                              {caleApproved ? "Rascunho criado" : "Confirma?"}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Domingos 02, 09, 16 e 23 (10h e 18h30), Dom 30 só às
                            18h30 e Quintas 06, 13, 20 e 27 às 19h30 —{" "}
                            <strong className="text-foreground">13 cultos</strong>{" "}
                            em rascunho.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              const next = !caleApproved;
                              setCaleApproved(next);
                              if (next) notifyPhone("Rascunho salvo em Fotografia.");
                            }}
                            className={cn(
                              "mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                              caleApproved
                                ? "border border-success/40 bg-success/15 text-success"
                                : "bg-foreground text-background hover:opacity-90",
                            )}
                          >
                            <Check size={13} />
                            {caleApproved
                              ? "Confirmado · Rascunho pronto"
                              : "Confirmar datas e criar rascunho"}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-full border border-border bg-card px-3.5 py-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {caleApproved
                            ? "Pronto! Quer montar Transmissão agora?"
                            : "Ajuste um horário ou confirme acima…"}
                        </span>
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Send size={11} />
                        </span>
                      </div>
                    </>
                  )}

                  {/* ==================== SERVO: CALENDÁRIO PESSOAL ==================== */}
                  {view === "servant_calendar" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Novembro 2026
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Lucas Alves · Fotografia
                              {activeProfile === "coordinator" && " (Coordenador)"}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                            3 escalações
                          </span>
                        </div>

                        {/* Grade mensal 7 colunas igual ao ServantCalendar.tsx */}
                        <div className="rounded-xl border border-card-border bg-card p-2.5">
                          <div className="mb-1.5 grid grid-cols-7 text-center font-mono text-[9px] font-bold text-muted-foreground">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                              <span key={i}>{d}</span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
                            {Array.from({ length: 30 }, (_, idx) => {
                              const day = idx + 1;
                              const isConfirmed =
                                day === 2 ||
                                day === 12 ||
                                day === 22 ||
                                (swapAccepted && day === 9);
                              return (
                                <span
                                  key={day}
                                  className={cn(
                                    "flex h-6 items-center justify-center rounded-md",
                                    isConfirmed
                                      ? "bg-primary font-bold text-primary-foreground"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {day}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Próximo culto confirmado do servo com ação real de negociar troca */}
                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                              Dom 02/11 · 18:30
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                notifyPhone("Escolha um colega do setor para trocar.");
                                setView("servant_swaps");
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[9px] text-foreground hover:border-primary/40"
                            >
                              <Repeat size={10} className="text-primary" />
                              Pedir troca
                            </button>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Fotografia · Com Marina Costa
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {activeProfile === "coordinator"
                            ? "Veja a aba Gestão na barra abaixo ↓"
                            : "Toque no ícone ao lado p/ falar com a Cale →"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setView("servant_ai")}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
                          aria-label="Abrir Assistente IA"
                          title="Assistente IA"
                        >
                          <Sparkles size={15} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* ==================== SERVO: ABA ATUAL ==================== */}
                  {view === "servant_month" && (
                    <>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-foreground">
                          Escalas deste mês
                        </p>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Escala Outubro — Fotografia
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Comunicação · 12 datas
                              </p>
                            </div>
                            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                              Preenchido
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Conferência de Primavera
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Transmissão · 3 datas
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                              Pendente
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("servant_next")}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        Preencher escala na aba Próxima →
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO: ABA PRÓXIMA (DISPONIBILIDADE) ==================== */}
                  {view === "servant_next" && (
                    <>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Próxima · Novembro
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Marque os cultos em que pode servir
                            </p>
                          </div>
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {availability.filter(Boolean).length}/5
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {[
                            { label: "Dom 02/11 · 10:00", sub: "Culto de Celebração" },
                            { label: "Dom 02/11 · 18:30", sub: "Culto de Celebração" },
                            { label: "Qui 06/11 · 19:30", sub: "Culto Propósito" },
                            { label: "Sáb 07/11 · 09:00", sub: "Sala de Oração" },
                            { label: "Dom 09/11 · 18:30", sub: "Culto de Celebração" },
                          ].map((slot, idx) => {
                            const checked = availability[idx];
                            return (
                              <button
                                key={slot.label}
                                type="button"
                                onClick={() => toggleDay(idx)}
                                aria-pressed={checked}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                                  checked
                                    ? "border-primary/50 bg-primary/10"
                                    : "border-card-border bg-card hover:bg-muted",
                                )}
                              >
                                <div>
                                  <p className="text-xs font-semibold text-foreground">
                                    {slot.label}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {slot.sub}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px]",
                                    checked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-transparent",
                                  )}
                                >
                                  <Check size={12} />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAvailabilitySaved(true);
                          notifyPhone("Disponibilidade salva com sucesso!");
                        }}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <Check size={13} />
                        {availabilitySaved
                          ? `Salvo (${availability.filter(Boolean).length} cultos marcados)`
                          : "Salvar minha disponibilidade"}
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO: ABA TODAS ==================== */}
                  {view === "servant_all" && (
                    <>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-foreground">
                          Todas as escalas do seu setor
                        </p>

                        {[
                          {
                            title: "Escala Novembro — Fotografia",
                            meta: "Comunicação · 13 datas",
                            badge: availabilitySaved ? "Preenchido" : "Pendente",
                            ok: availabilitySaved,
                          },
                          {
                            title: "Escala Outubro — Fotografia",
                            meta: "Comunicação · 12 datas",
                            badge: "Preenchido",
                            ok: true,
                          },
                          {
                            title: "Conferência de Primavera",
                            meta: "Transmissão · 3 datas",
                            badge: "Preenchido",
                            ok: true,
                          },
                        ].map((sch) => (
                          <div
                            key={sch.title}
                            className="rounded-xl border border-card-border bg-card p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  {sch.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {sch.meta}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                                  sch.ok
                                    ? "bg-success/15 text-success"
                                    : "bg-primary/15 text-primary",
                                )}
                              >
                                {sch.badge}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("servant_whatsapp")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/50"
                      >
                        <BellRing size={13} className="text-primary" />
                        Ver lembretes automáticos no WhatsApp
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO: ASSISTENTE IA (CALE) ==================== */}
                  {view === "servant_ai" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Assistente Cale · Servo
                          </span>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                            Agenda pessoal
                          </span>
                        </div>

                        <div className="ml-6 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground">
                          Cale, quais são os meus dias confirmados em novembro?
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <p className="text-[11px] leading-relaxed text-foreground">
                            Olá, <strong>Lucas</strong>! Em novembro você está
                            confirmado em <strong>Fotografia</strong> nos dias:
                          </p>
                          <ul className="mt-2 space-y-1 font-mono text-[10px] text-muted-foreground">
                            <li>• Dom 02/11 às 18:30 (Celebração)</li>
                            <li>• Qui 12/11 às 19:30 (Propósito)</li>
                            <li>• Dom 22/11 às 18:30 (Celebração)</li>
                          </ul>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Posso registrar sua disponibilidade na próxima escala
                            ou pedir uma troca se precisar.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("servant_calendar")}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground"
                      >
                        Voltar ao meu Calendário
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO: SINO DE TROCAS (NotificationBell) ==================== */}
                  {view === "servant_swaps" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            Pedidos de troca
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[10px]",
                              swapAccepted
                                ? "bg-success/15 text-success"
                                : "bg-primary/15 text-primary",
                            )}
                          >
                            {swapAccepted ? "Dia assumido" : "1 pendente"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-card-border bg-card p-3.5">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            DOMINGO · 09/11 ÀS 18:30 · FOTOGRAFIA
                          </p>
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            Marina Costa quer trocar este dia com você
                          </p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                            Ao aceitar, o dia 09/11 passa imediatamente para o
                            seu calendário pessoal.
                          </p>

                          <div className="mt-3.5 flex items-center gap-2">
                            {!swapAccepted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSwapAccepted(true);
                                  notifyPhone("Troca aceita. O dia agora é seu.");
                                }}
                                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 text-xs font-semibold text-success-foreground transition-opacity hover:opacity-90"
                              >
                                <Check size={13} />
                                Aceitar
                              </button>
                            ) : (
                              <div className="flex w-full items-center justify-between rounded-xl border border-success/40 bg-success/10 px-3 py-2">
                                <span className="text-xs font-semibold text-success">
                                  09/11 adicionado ao seu Calendário
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSwapAccepted(false)}
                                  className="font-mono text-[10px] text-muted-foreground underline hover:text-foreground"
                                >
                                  Desfazer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("servant_calendar")}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground"
                      >
                        Conferir dia no meu Calendário
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO: WHATSAPP ==================== */}
                  {view === "servant_whatsapp" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            Avisos no WhatsApp
                          </span>
                          <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] text-success">
                            Automático
                          </span>
                        </div>

                        <div className="rounded-2xl border border-card-border bg-card p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-primary">
                              Escala aberta p/ preenchimento
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              14:20
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            A escala <strong className="text-foreground">Novembro · Fotografia</strong> foi publicada! Toque para abrir direto na aba{" "}
                            <span className="font-mono text-primary">?aba=next</span>.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-success/30 bg-card p-3.5">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-semibold text-success">
                              Lembrete de culto
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              18:00
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground">
                            Olá, <strong>Lucas</strong>! 🙏 Amanhã (
                            <strong>Dom 02/11 às 18:30</strong>) você está
                            escalado em <strong>Fotografia</strong>.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("servant_next")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background"
                      >
                        <BellRing size={13} />
                        Abrir link na aba Próxima
                      </button>
                    </>
                  )}

                  {/* ==================== SERVO COORDENADOR: ABA GESTÃO ==================== */}
                  {view === "coordinator_manage" && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Aba Gestão · Coordenador
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Mesmo painel de servo + autonomia no setor
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary">
                            2 setores
                          </span>
                        </div>

                        {/* Filtro entre múltiplos setores coordenados (CoordinatorSchedulePanel real) */}
                        <div className="flex items-center gap-1.5">
                          {(["Fotografia", "Transmissão"] as const).map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setCoordSectorFilter(sec)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors",
                                coordSectorFilter === sec
                                  ? "border-primary bg-primary/15 font-semibold text-primary"
                                  : "border-border bg-card text-muted-foreground",
                              )}
                            >
                              {sec}
                            </button>
                          ))}
                        </div>

                        <div className="rounded-xl border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Escala Novembro — {coordSectorFilter}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                Situação:{" "}
                                {coordPublished ? "Publicada" : "Rascunho"} · 13
                                datas
                              </p>
                            </div>
                            <Switch
                              checked={coordPublished}
                              onChange={(next) => {
                                setCoordPublished(next);
                                notifyPhone(
                                  next
                                    ? `Escala de ${coordSectorFilter} publicada!`
                                    : "Escala movida para rascunho.",
                                );
                              }}
                              label="Alternar situação da escala coordenada"
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                notifyPhone("Link /escala/... copiado!")
                              }
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-1.5 text-[10px] font-semibold text-foreground hover:border-primary/40"
                            >
                              <LinkIcon size={11} className="text-primary" />
                              Copiar link
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const target =
                                  coordSectorFilter === "Fotografia"
                                    ? "Transmissão"
                                    : "Fotografia";
                                notifyPhone(`Duplicada em rascunho p/ ${target}!`);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-1.5 text-[10px] font-semibold text-foreground hover:border-primary/40"
                            >
                              <Copy size={11} className="text-primary" />
                              Duplicar
                            </button>
                          </div>
                        </div>

                        <p className="rounded-xl border border-border/70 bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
                          Repare na barra inferior: a 5ª aba{" "}
                          <strong className="text-foreground">Gestão</strong>{" "}
                          aparece só para quem coordena setor, sem esconder o seu
                          próprio Calendário de servo.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("leader_ai")}
                        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        <Sparkles size={13} />
                        Pedir escala do setor à Cale IA
                      </button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Toast interno do aparelho */}
              <AnimatePresence>
                {phoneToast && (
                  <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="pointer-events-none absolute inset-x-3.5 bottom-2 rounded-full border border-primary/40 bg-card/95 px-3 py-1.5 text-center font-mono text-[10px] font-medium text-foreground shadow-lg backdrop-blur-sm"
                  >
                    {phoneToast}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BARRA INFERIOR FIEL A CADA PERFIL */}
            {activeProfile === "admin" && (
              <nav
                aria-label="Menu do Administrador"
                className="grid shrink-0 grid-cols-4 items-center border-t border-border/70 bg-card/70 px-2 py-2"
              >
                {[
                  { id: "admin_overview", label: "Visão Geral", icon: LayoutDashboard },
                  { id: "admin_ministries", label: "Ministérios", icon: Church },
                  { id: "leader_ai", label: "Assistente", icon: Sparkles },
                  { id: "admin_settings", label: "Config.", icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id as InternalView)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                      view === tab.id
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            )}

            {activeProfile === "leader" && (
              <nav
                aria-label="Menu do Líder de Ministério"
                className="grid shrink-0 grid-cols-4 items-center border-t border-border/70 bg-card/70 px-2 py-2"
              >
                {[
                  { id: "leader_overview", label: "Geral", icon: LayoutDashboard },
                  { id: "leader_servants", label: "Servos", icon: Users },
                  { id: "leader_schedules", label: "Escalas", icon: Calendar },
                  { id: "leader_ai", label: "Assistente", icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id as InternalView)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
                      view === tab.id
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            )}

            {isServantShell && (
              <nav
                aria-label="Barra de abas do Servo"
                className={cn(
                  "grid shrink-0 items-center border-t border-border/70 bg-card/70 px-1.5 py-2",
                  activeProfile === "coordinator" ? "grid-cols-5" : "grid-cols-4",
                )}
              >
                {[
                  { id: "servant_calendar", label: "Calendário", icon: CalendarDays },
                  { id: "servant_month", label: "Atual", icon: CalendarRange },
                  { id: "servant_next", label: "Próxima", icon: CalendarPlus },
                  { id: "servant_all", label: "Todas", icon: ListChecks },
                  ...(activeProfile === "coordinator"
                    ? [
                        {
                          id: "coordinator_manage",
                          label: "Gestão",
                          icon: ClipboardList,
                        },
                      ]
                    : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id as InternalView)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors",
                      view === tab.id
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <tab.icon size={15} />
                    <span className="max-w-full truncate">{tab.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
