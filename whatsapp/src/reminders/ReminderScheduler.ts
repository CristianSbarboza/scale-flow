import type { Clock, ServiceClock } from "../time/ServiceClock.js";
import { ReminderMessage } from "./ReminderMessage.js";
import { REMINDER_KINDS, type DueReminder, type ReminderKind, type ReminderStore, type Sender } from "./types.js";

export interface SchedulerOptions {
  /** Quanto tempo depois do horário ainda vale enviar. */
  toleranceMinutes: number;
  lookbackHours: number;
  lookaheadHours: number;
  sendDelayMinMs: number;
  sendDelayMaxMs: number;
  /** Verdadeiro: decide tudo e registra, mas não envia. Para ensaiar em produção. */
  dryRun: boolean;
  /** Endereço público do app, para o link no fim da mensagem. */
  appUrl?: string | null;
}

export interface TickResult {
  sent: number;
  failed: number;
  skipped: number;
  /** Vencem no futuro — não fazem nada agora, contam só para o log. */
  waiting: number;
}

/**
 * O laço. Recebe tudo pelo construtor e **não conhece** Baileys nem SQL: fala
 * com `ReminderStore`, `Sender` e `ServiceClock`.
 *
 * É o que permite verificar a regra difícil — "este aviso venceu?" — passando
 * um relógio falso, sem esperar as 09h nem conectar em nada.
 */
export class ReminderScheduler {
  private readonly message: ReminderMessage;

  constructor(
    private readonly store: ReminderStore,
    private readonly sender: Sender,
    private readonly clock: ServiceClock & Clock,
    private readonly options: SchedulerOptions,
    private readonly log: (line: string) => void = console.log,
  ) {
    this.message = new ReminderMessage(clock, undefined, options.appUrl ?? null);
  }

  async tick(): Promise<TickResult> {
    const result: TickResult = { sent: 0, failed: 0, skipped: 0, waiting: 0 };
    for (const kind of REMINDER_KINDS) {
      await this.processKind(kind, result);
    }
    return result;
  }

  private async processKind(kind: ReminderKind, result: TickResult): Promise<void> {
    const now = this.clock.now();
    const [fromDate, toDate] = this.dateWindow(now);
    const candidatos = await this.store.findCandidates(kind, fromDate, toDate);

    for (const reminder of candidatos) {
      const decisao = this.decide(reminder, kind, now);

      if (decisao === "waiting") {
        result.waiting++;
        continue;
      }

      // Reserva ANTES de enviar. Se outra instância já pegou, `claim` devolve
      // null e este processo simplesmente não mexe.
      const claimId = await this.store.claim(reminder, kind);
      if (claimId === null) continue;

      if (decisao === "late") {
        // RF05: aviso atrasado não sai. "Seu culto é em 2 horas" chegando
        // depois do culto destrói a confiança em todos os próximos.
        await this.store.finish(claimId, "skipped", "horário já passado quando o serviço processou");
        result.skipped++;
        this.log(`skip  ${kind} ${reminder.servantName} — atrasado`);
        continue;
      }

      await this.deliver(reminder, kind, claimId, result);
      await this.pace();
    }
  }

  private async deliver(
    reminder: DueReminder,
    kind: ReminderKind,
    claimId: number,
    result: TickResult,
  ): Promise<void> {
    const texto = this.message.build(reminder, kind);
    try {
      if (this.options.dryRun) {
        this.log(`dry   ${kind} ${reminder.servantName} <${reminder.phone}>`);
      } else {
        await this.sender.send(reminder.phone, texto);
        this.log(`sent  ${kind} ${reminder.servantName}`);
      }
      await this.store.finish(claimId, "sent", this.options.dryRun ? "dry-run" : undefined);
      result.sent++;
    } catch (erro) {
      // Falha de um não interrompe os demais (RF06). O motivo fica gravado,
      // porque "não chegou" sem explicação é indepurável.
      const motivo = erro instanceof Error ? erro.message : String(erro);
      await this.store.finish(claimId, "failed", motivo.slice(0, 500));
      result.failed++;
      this.log(`FAIL  ${kind} ${reminder.servantName} — ${motivo}`);
    }
  }

  /**
   * A decisão central desta spec.
   *
   * Janela, não igualdade: sem tolerância, um minuto de indisponibilidade
   * pularia o aviso para sempre; com tolerância grande demais, volta o
   * problema do aviso atrasado.
   */
  private decide(reminder: DueReminder, kind: ReminderKind, now: Date): "waiting" | "due" | "late" {
    const dueAt = this.clock.dueAt(reminder.service, kind).getTime();
    const agora = now.getTime();
    if (agora < dueAt) return "waiting";
    if (agora < dueAt + this.options.toleranceMinutes * 60_000) return "due";
    return "late";
  }

  /**
   * Recorte grosso por data, para a consulta não varrer o histórico.
   *
   * Um dia de folga de cada lado porque o aviso de véspera vence no dia
   * anterior ao culto, e o de 2 horas pode cair na madrugada do dia anterior.
   */
  private dateWindow(now: Date): [string, string] {
    const hora = 60 * 60 * 1000;
    const inicio = new Date(now.getTime() - (this.options.lookbackHours + 24) * hora);
    const fim = new Date(now.getTime() + (this.options.lookaheadHours + 24) * hora);
    return [inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)];
  }

  /**
   * Espaço entre mensagens. Rajada é o sinal mais forte de automação que
   * existe, e o número aqui é pessoal — um ban leva junto a conta de verdade.
   */
  private pace(): Promise<void> {
    if (this.options.dryRun) return Promise.resolve();
    const { sendDelayMinMs: min, sendDelayMaxMs: max } = this.options;
    const espera = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, espera));
  }
}
