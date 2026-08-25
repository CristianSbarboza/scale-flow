import type { WallTime } from "../time/ServiceClock.js";

/**
 * Os avisos por DATA. Cada um vence num instante calculado a partir do culto.
 * A ordem de checagem no ciclo é esta.
 */
export const REMINDER_KINDS = ["day_before", "two_hours"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/**
 * O aviso por ESCALA, separado dos de cima porque é outra coisa: não tem
 * horário para vencer, dispara quando a escala é publicada, e vai para **todo
 * o setor** — inclusive quem ainda não tem data, já que o objetivo é pedir que
 * preencham a disponibilidade.
 */
export const PUBLISHED_KIND = "schedule_published" as const;
export type NotificationKind = ReminderKind | typeof PUBLISHED_KIND;

/** Uma escala recém-publicada e um servo do setor que ainda não foi avisado. */
export interface PublishedNotice {
  scheduleId: number;
  scheduleName: string;
  servantId: number;
  servantName: string;
  phone: string;
  ministryName: string;
  sectorName: string;
  /** O que o servo digita no campo "Igreja" do login. Ver `DueReminder`. */
  churchUsername: string;
  /** Quantas datas a escala tem, para a mensagem dizer o tamanho. */
  dateCount: number;
  /** Primeira e última data, para situar o período. */
  firstDate: string;
  lastDate: string;
}

export type SendStatus = "sent" | "failed" | "skipped";

/** Um servo escalado que ainda não recebeu determinado aviso. */
export interface DueReminder {
  dateId: number;
  servantId: number;
  servantName: string;
  /** E.164 sem `+`, como o banco guarda. Nunca nulo aqui — a consulta filtra. */
  phone: string;
  churchName: string;
  /**
   * O *username* da igreja, não o nome de exibição: é o que o servo digita no
   * campo "Igreja" do login, e o único dado do pareamento que ele não tem como
   * adivinhar — o formulário hoje só sabe dizer "peça ao líder se não souber".
   */
  churchUsername: string;
  ministryName: string;
  sectorName: string;
  scheduleName: string;
  service: WallTime;
}

/** Dados de uma pessoa para montar uma mensagem de teste. */
export type PreviewContext = Pick<
  DueReminder,
  "servantName" | "churchName" | "churchUsername" | "ministryName" | "sectorName"
>;

/**
 * Persistência dos lembretes. O agendador depende disto, não de SQL.
 *
 * `claim` devolve `null` quando outra instância já pegou aquele aviso — é o
 * que torna seguro rodar dois processos por engano.
 */
export interface ReminderStore {
  findCandidates(kind: ReminderKind, fromDate: string, toDate: string): Promise<DueReminder[]>;
  /** Escalas publicadas há menos de `sinceHours` cujo setor ainda não foi avisado. */
  findPublishedNotices(sinceHours: number): Promise<PublishedNotice[]>;
  claimPublished(notice: PublishedNotice): Promise<number | null>;
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
