import type { ServiceClock } from "../time/ServiceClock.js";
import type { DueReminder, ReminderKind } from "./types.js";

/**
 * O texto da mensagem. Classe pura: recebe o relógio, não olha o banco nem a
 * rede — o que a torna verificável sem nada ligado.
 *
 * A igreja aparece no topo porque **um número atende todas elas**. Sem isso,
 * quem serve em mais de uma comunidade recebe um aviso sem saber de qual é.
 */
export class ReminderMessage {
  constructor(private readonly clock: ServiceClock) {}

  build(reminder: DueReminder, kind: ReminderKind): string {
    const quando = this.clock.describe(reminder.service);
    const abertura = kind === "day_before"
      ? `Você está escalado(a) *amanhã*, ${quando}.`
      : `Você está escalado(a) *hoje*, ${quando} — daqui a pouco mais de 2 horas.`;

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
