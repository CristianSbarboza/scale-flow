import type { ServiceClock } from "../time/ServiceClock.js";
import { VerseBook } from "./VerseBook.js";
import type { DueReminder, ReminderKind } from "./types.js";

/**
 * O texto da mensagem. Classe pura: recebe o relógio, não olha o banco nem a
 * rede — o que a torna verificável sem nada ligado.
 *
 * A igreja aparece no topo porque **um número atende todas elas**. Sem isso,
 * quem serve em mais de uma comunidade recebe um aviso sem saber de qual é.
 */
export class ReminderMessage {
  constructor(
    private readonly clock: ServiceClock,
    private readonly verses: VerseBook = new VerseBook(),
  ) {}

  build(reminder: DueReminder, kind: ReminderKind): string {
    const quando = this.clock.describe(reminder.service);
    const abertura = kind === "day_before"
      ? `Você está escalado(a) *amanhã*, ${quando}.`
      : `Você está escalado(a) *hoje*, ${quando} — daqui a pouco mais de 2 horas.`;

    // A semente é a própria mensagem: mesmo lembrete, mesmo versículo. Ver
    // VerseBook para por que não é sorteio de verdade.
    //
    // No aviso de 2 horas, passamos o versículo da véspera como `avoid`: a
    // pessoa recebe os dois em menos de um dia, e o texto repetido pareceria
    // falha de sistema.
    const seed = (k: ReminderKind) => `${reminder.dateId}:${reminder.servantId}:${k}`;
    const versiculo = kind === "day_before"
      ? this.verses.pick(seed("day_before"))
      : this.verses.pick(seed("two_hours"), this.verses.pick(seed("day_before")));

    return [
      `🔔 *${reminder.churchName}*`,
      ``,
      `Olá, ${primeiroNome(reminder.servantName)}!`,
      abertura,
      ``,
      `*Ministério:* ${reminder.ministryName}`,
      `*Setor:* ${reminder.sectorName}`,
      `*Escala:* ${reminder.scheduleName}`,
      ``,
      // O versículo fecha a mensagem, depois da informação prática. Vindo
      // antes, a pessoa teria que passar por ele para achar o horário.
      `_"${versiculo.text}"_`,
      `— *${versiculo.reference}*`,
      ``,
      `_Mensagem automática do ScaleFlow._`,
    ].join("\n");
  }
}

/**
 * Só o primeiro nome na saudação. "Olá, Maria!" soa como gente; "Olá, Maria
 * Aparecida da Silva Souza!" soa como cobrança de banco.
 */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
