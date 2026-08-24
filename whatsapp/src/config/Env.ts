/**
 * Variáveis de ambiente, lidas e validadas **na subida**.
 *
 * Validar no primeiro uso significaria descobrir que falta `DATABASE_URL` às
 * 09h, na hora do primeiro lembrete, com o processo já "no ar" havia horas.
 * Aqui, faltando qualquer coisa obrigatória, ele não sobe.
 */
export class Env {
  private constructor(
    readonly databaseUrl: string,
    readonly port: number,
    readonly timeZone: string,
    readonly sessionDir: string,
    /** Quanto tempo depois do horário ainda vale enviar. Ver RF05. */
    readonly toleranceMinutes: number,
    /** Intervalo entre mensagens. Rajada é o sinal mais forte de automação. */
    readonly sendDelayMinMs: number,
    readonly sendDelayMaxMs: number,
    /** Só processa datas nesta janela — evita varrer o histórico inteiro. */
    readonly lookbackHours: number,
    readonly lookaheadHours: number,
    readonly dryRun: boolean,
    /**
     * Habilita `POST /test-send`. Vazio = a rota nem é registrada.
     *
     * Um endpoint que dispara WhatsApp para qualquer número é relay aberto, e
     * o número aqui é pessoal. Sem segredo, a rota não existe.
     */
    readonly controlToken: string | null,
    /**
     * Endereço público do app, para o link no fim da mensagem.
     *
     * Sem ele a linha do link simplesmente não sai — mandar um link quebrado
     * é pior que não mandar link.
     */
    readonly appUrl: string | null,
    /** Quanto tempo depois de publicada uma escala ainda vale avisar. */
    readonly publishedWindowHours: number,
  ) {}

  static load(source: NodeJS.ProcessEnv = process.env): Env {
    const databaseUrl = required(source, "DATABASE_URL");

    const env = new Env(
      databaseUrl,
      number(source, "PORT", 3100),
      source.TIMEZONE?.trim() || "America/Sao_Paulo",
      source.SESSION_DIR?.trim() || "./.session",
      number(source, "TOLERANCE_MINUTES", 15),
      number(source, "SEND_DELAY_MIN_MS", 20_000),
      number(source, "SEND_DELAY_MAX_MS", 55_000),
      number(source, "LOOKBACK_HOURS", 48),
      number(source, "LOOKAHEAD_HOURS", 48),
      source.DRY_RUN === "true",
      source.CONTROL_TOKEN?.trim() || null,
      source.APP_URL?.trim().replace(/\/+$/, "") || null,
      number(source, "PUBLISHED_WINDOW_HOURS", 48),
    );

    if (env.sendDelayMinMs > env.sendDelayMaxMs) {
      throw new Error("SEND_DELAY_MIN_MS não pode ser maior que SEND_DELAY_MAX_MS.");
    }
    // Um fuso inválido faria toda conta de horário silenciosamente errada,
    // então falha aqui em vez de mandar lembrete na hora errada.
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: env.timeZone });
    } catch {
      throw new Error(`TIMEZONE inválido: "${env.timeZone}".`);
    }
    return env;
  }

  /** Alvo com a senha escondida, para o log da subida. */
  get redactedDatabase(): string {
    return this.databaseUrl.replace(/:\/\/[^@]*@/, "://***@").replace(/@[^/]*\//, "@***/");
  }
}

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

function number(source: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = source[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} precisa ser um número: "${raw}"`);
  return parsed;
}
