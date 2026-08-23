import type { ILogger } from "@whiskeysockets/baileys/lib/Utils/logger.js";

/**
 * Logger do Baileys reduzido a avisos e erros.
 *
 * O padrão é pino em nível `info`, que despeja um JSON de várias linhas a cada
 * handshake — inclusive o `devicePairingData`. Isso enterra as mensagens do
 * próprio serviço ("sessão: awaiting_qr", "ciclo: ...") no meio de ruído, e
 * quem está operando precisa justamente dessas.
 *
 * `warn` e `error` continuam passando: sumir com eles trocaria ruído por
 * silêncio, que é pior.
 */
export function quietLogger(prefix = "baileys"): ILogger {
  const noop = () => {};
  const logger: ILogger = {
    level: "warn",
    child: () => logger,
    trace: noop,
    debug: noop,
    info: noop,
    warn: (obj, msg) => console.warn(`[${prefix}] ${msg ?? ""}`, resumo(obj)),
    error: (obj, msg) => console.error(`[${prefix}] ${msg ?? ""}`, resumo(obj)),
  };
  return logger;
}

/** Só a mensagem do erro, não o objeto inteiro do Baileys. */
function resumo(obj: unknown): string {
  if (obj instanceof Error) return obj.message;
  if (obj && typeof obj === "object" && "message" in obj) return String(obj.message);
  return "";
}
