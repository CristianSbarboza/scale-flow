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
    appUrl: string | null = null,
  ) {
    // Tira a barra final aqui, e não em quem chama: o Env normaliza, mas esta
    // classe também é construída direto (rota de teste, verificações), e uma
    // barra sobrando vira `https://app//servant`.
    this.appUrl = appUrl?.replace(/\/+$/, "") || null;
  }

  /** Endereço público do app, já sem barra final. */
  private readonly appUrl: string | null;

  build(reminder: DueReminder, kind: ReminderKind): string {
    // Hora antes da data, as duas em negrito: o horário é o que a pessoa
    // precisa saber de relance; a data confirma.
    const { hora, data } = this.clock.describeParts(reminder.service);
    const dia = kind === "day_before" ? "*amanhã*" : "*hoje*";
    const abertura = `Você está escalado(a) ${dia}, às *${hora}* — *${data}*.`;

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
      `Olá, ${primeiroNome(reminder.servantName)}!`,
      abertura,
      ``,
      `*Ministério:* ${reminder.ministryName}`,
      `*Setor:* ${reminder.sectorName}`,
      ``,
      // O versículo vem depois da informação prática. Antes, a pessoa teria
      // que passar por ele para achar o horário.
      `_"${versiculo.text}"_`,
      `— *${versiculo.reference}*`,
      // A linha do link só existe se houver endereço configurado: link
      // quebrado é pior que link nenhum.
      ...(this.appUrl ? [``, `Para mais detalhes, acesse sua conta:`, `${this.appUrl}/servant`] : []),
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
