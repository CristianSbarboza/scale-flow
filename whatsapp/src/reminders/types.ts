import type { WallTime } from "../time/ServiceClock.js";

/** Os dois avisos. A ordem de checagem no ciclo é esta. */
export const REMINDER_KINDS = ["day_before", "two_hours"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export type SendStatus = "sent" | "failed" | "skipped";

/** Um servo escalado que ainda não recebeu determinado aviso. */
export interface DueReminder {
  dateId: number;
  servantId: number;
  servantName: string;
  /** E.164 sem `+`, como o banco guarda. Nunca nulo aqui — a consulta filtra. */
  phone: string;
  churchName: string;
  ministryName: string;
  sectorName: string;
  scheduleName: string;
  service: WallTime;
}

/** Dados de uma pessoa para montar uma mensagem de teste. */
export type PreviewContext = Pick<
  DueReminder,
  "servantName" | "churchName" | "ministryName" | "sectorName"
>;

/**
 * Persistência dos lembretes. O agendador depende disto, não de SQL.
 *
 * `claim` devolve `null` quando outra instância já pegou aquele aviso — é o
 * que torna seguro rodar dois processos por engano.
 */
export interface ReminderStore {
  findCandidates(kind: ReminderKind, fromDate: string, toDate: string): Promise<DueReminder[]>;
  /** Nome, igreja, ministério e setor de um servo, para a mensagem de teste. */
  findContextByUsername(username: string): Promise<PreviewContext | null>;
  claim(reminder: DueReminder, kind: ReminderKind): Promise<number | null>;
  finish(claimId: number, status: SendStatus, detail?: string): Promise<void>;
  countByStatus(): Promise<Record<string, number>>;
}

/** Envio de mensagem. Implementado pelo Baileys, dublê no teste. */
export interface Sender {
  /** `phone` em E.164 sem `+`. Lança se não conseguir entregar. */
  send(phone: string, text: string): Promise<void>;
  isReady(): boolean;
}
