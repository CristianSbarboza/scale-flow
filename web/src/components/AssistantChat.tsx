"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowUp,
  RotateCcw,
  AlertTriangle,
  Check,
  X,
  Settings,
} from "lucide-react";
import Button, { buttonClass } from "@/components/ui/Button";
import LoadingDots from "@/components/ui/LoadingDots";
import {
  getUserAiSettings,
  sendAiChatMessage,
  confirmAiPendingAction,
} from "@/lib/actions/ai";
import { useToast } from "@/components/Toast";
import type {
  AiChatMessage,
  AiPendingConfirmation,
  AiUserSettingsView,
} from "@/types/domain";

const MAX_INPUT_CHARS = 500;

interface AssistantChatProps {
  role: "admin" | "leader" | "servant";
  isCoordinator?: boolean;
  userName?: string;
}

function getQuickSuggestions(
  role: "admin" | "leader" | "servant",
  isCoordinator: boolean,
): string[] {
  if (role === "admin") {
    return [
      "Listar ministérios e setores",
      "Quais escalas estão abertas?",
      "Listar servos cadastrados",
      "Criar uma nova escala",
    ];
  }
  if (role === "leader") {
    return [
      "Listar setores do meu ministério",
      "Ver escalas e disponibilidades",
      "Listar servos do meu ministério",
      "Criar nova escala no meu setor",
    ];
  }
  if (isCoordinator) {
    return [
      "Ver escalas que eu coordeno",
      "Minhas datas escaladas neste mês",
      "Criar escala para o meu setor",
      "Ver pedidos de troca pendentes",
    ];
  }
  return [
    "Quais são os meus próximos dias de escala?",
    "Quero informar minha disponibilidade",
    "Tenho algum pedido de troca pendente?",
    "Quem está escalado comigo?",
  ];
}

export default function AssistantChat({
  role,
  isCoordinator = false,
  userName = "",
}: AssistantChatProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AiUserSettingsView | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const seqRef = useRef(0);

  const nextId = (prefix: string) => {
    seqRef.current += 1;
    return `${prefix}_${seqRef.current}`;
  };

  useEffect(() => {
    let active = true;
    getUserAiSettings()
      .then((res) => {
        if (!active) return;
        setSettings(res);
      })
      .catch(() => {
        if (active) {
          showToast("Não foi possível carregar a assistente.", "error");
        }
      })
      .finally(() => {
        if (active) setLoadingConfig(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const assistantName = settings?.effectiveName ?? "Cale";
  const firstName = userName.trim().split(" ")[0] || "irmão(ã)";
  const suggestions = getQuickSuggestions(role, isCoordinator);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input, isEmpty]);

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    if (text.length > MAX_INPUT_CHARS) {
      showToast(`Mensagem muito longa (máx. ${MAX_INPUT_CHARS} caracteres).`, "error");
      return;
    }

    const userMsg: AiChatMessage = {
      id: nextId("user"),
      role: "user",
      content: text,
      createdAt: "now",
    };

    const historyForServer = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInput("");
    setSending(true);

    try {
      const res = await sendAiChatMessage(historyForServer, text);
      const aiMsg: AiChatMessage = {
        id: nextId("ai"),
        role: "assistant",
        content: res.reply,
        createdAt: "now",
        pendingConfirmation: res.pendingConfirmation,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao conversar com a assistente.",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  const handleConfirmAction = async (
    messageId: string,
    confirmation: AiPendingConfirmation,
  ) => {
    setConfirmingId(messageId);
    try {
      const res = await confirmAiPendingAction(confirmation);
      const confId = nextId("ai_conf");
      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === messageId ? { ...m, pendingConfirmation: undefined } : m,
          )
          .concat({
            id: confId,
            role: "assistant",
            content: res.reply,
            createdAt: "now",
          }),
      );
      showToast("Exclusão confirmada.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Não foi possível concluir a exclusão.",
        "error",
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelConfirmation = (messageId: string) => {
    const cancelId = nextId("ai_cancel");
    setMessages((prev) =>
      prev
        .map((m) =>
          m.id === messageId ? { ...m, pendingConfirmation: undefined } : m,
        )
        .concat({
          id: cancelId,
          role: "assistant",
          content: "Tudo bem! Cancelei a exclusão e nenhum dado foi apagado.",
          createdAt: "now",
        }),
    );
  };

  const handleReset = () => {
    setMessages([]);
  };

  if (loadingConfig) {
    return (
      <div className="mx-auto flex min-h-[65dvh] w-full max-w-3xl items-center justify-center text-muted-foreground sm:min-h-[75dvh]">
        <LoadingDots label="Carregando assistente" />
      </div>
    );
  }

  const composerBox = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="glass w-full rounded-3xl p-2.5 shadow-lg transition-all focus-within:border-primary/50 sm:p-3"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        maxLength={MAX_INPUT_CHARS}
        disabled={sending || !settings?.isConfigured}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={
          settings?.isConfigured
            ? `Pergunte ou peça algo para ${assistantName}...`
            : "Ative a chave de API nas configurações para conversar..."
        }
        className="max-h-40 min-h-9 w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 sm:text-sm"
      />

      <div className="mt-1 flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              title="Nova conversa"
            >
              <RotateCcw size={13} />
              <span>Nova conversa</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[0.6875rem] text-muted-foreground">
            {input.length}/{MAX_INPUT_CHARS}
          </span>

          <button
            type="submit"
            disabled={sending || !input.trim() || !settings?.isConfigured}
            aria-label="Enviar mensagem"
            className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </form>
  );

  const stickyBottomClass =
    role === "servant" ? "bottom-16 sm:bottom-0" : "bottom-0";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-3xl flex-col justify-between px-1 sm:min-h-[calc(100dvh-5rem)] sm:px-4">
      {/* Aviso caso a igreja ainda não tenha configurado a chave de API */}
      {settings && !settings.isConfigured && (
        <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-primary/10 px-4 py-3.5">
          <div className="flex items-center gap-2.5 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-primary" />
            <span>
              {role === "admin"
                ? "Configure a chave de API da sua igreja (Gemini, Claude, OpenAI, Groq ou Grok) para ativar a assistente."
                : "O administrador da sua igreja ainda não configurou a chave da assistente de IA."}
            </span>
          </div>
          {role === "admin" && (
            <Link
              href="/admin/settings"
              className={buttonClass("primary", "px-3 py-1.5 text-xs")}
            >
              <Settings size={14} />
              Configurar Chave
            </Link>
          )}
        </div>
      )}

      {isEmpty ? (
        /* Estado inicial centralizado estilo Gemini / Claude / ChatGPT */
        <div className="flex flex-1 flex-col items-center justify-center py-4 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-6 px-2 text-center sm:mb-8"
          >
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:mb-4 sm:size-12">
              <Sparkles size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
              A paz, {firstName}! Eu sou a {assistantName}.
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-base">
              Como posso ajudar você com as escalas hoje?
            </p>
          </motion.div>

          <div className="w-full">{composerBox}</div>

          {settings?.isConfigured && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend(suggestion)}
                  className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50 sm:px-3.5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Modo de conversa ativa estilo Gemini / ChatGPT / Claude */
        <>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4 sm:gap-6 sm:py-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {isUser ? (
                      <div className="max-w-[88%] rounded-3xl bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground sm:max-w-[75%] sm:px-5 sm:py-3">
                        <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="flex max-w-[96%] items-start gap-2.5 sm:max-w-[85%] sm:gap-3.5">
                        <div
                          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary sm:size-8"
                          aria-hidden
                        >
                          <Sparkles size={14} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2 pt-0.5 text-sm leading-relaxed text-foreground sm:pt-1">
                          <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>

                          {/* Cartão de confirmação explícita para exclusões */}
                          {msg.pendingConfirmation && (
                            <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 sm:p-4">
                              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-destructive">
                                <AlertTriangle size={14} />
                                Confirmação de Exclusão
                              </div>
                              <p className="mb-3 text-xs text-foreground">
                                {msg.pendingConfirmation.summary}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="danger"
                                  disabled={confirmingId === msg.id}
                                  onClick={() =>
                                    handleConfirmAction(msg.id, msg.pendingConfirmation!)
                                  }
                                  className="px-3 py-1.5 text-xs"
                                >
                                  <Check size={14} />
                                  {confirmingId === msg.id
                                    ? "Excluindo..."
                                    : "Confirmar Exclusão"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={confirmingId === msg.id}
                                  onClick={() => handleCancelConfirmation(msg.id)}
                                  className="px-3 py-1.5 text-xs"
                                >
                                  <X size={14} />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {sending && (
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary sm:size-8"
                  aria-hidden
                >
                  <Sparkles size={14} />
                </div>
                <div className="py-2 text-muted-foreground">
                  <LoadingDots size="sm" label={`${assistantName} está respondendo`} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className={`sticky ${stickyBottomClass} bg-background/85 pt-2 pb-3 backdrop-blur-md sm:pb-4`}>
            {composerBox}
          </div>
        </>
      )}
    </div>
  );
}
