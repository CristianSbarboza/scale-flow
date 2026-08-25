import type { ServiceClock } from "../time/ServiceClock.js";
import { VerseBook } from "./VerseBook.js";
import type { DueReminder, PublishedNotice, ReminderKind } from "./types.js";

/**
 * O texto da mensagem. Classe pura: recebe o relógio, não olha o banco nem a
 * rede — o que a torna verificável sem nada ligado.
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
    // Só a hora. "amanhã"/"hoje" já situa o dia, e a data por extenso ao lado
    // repetia a mesma informação em outro formato.
    const { hora } = this.clock.describeParts(reminder.service);
    const dia = kind === "day_before" ? "*amanhã*" : "*hoje*";
    const abertura = `Você está escalado(a) ${dia}, às *${hora}*.`;

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
      ...this.comoEntrar(reminder.churchUsername, reminder.servantUsername),
      ``,
      `_Mensagem automática do ScaleFlow._`,
    ].join("\n");
  }

  /**
   * Aviso de escala publicada. Vai para **todo o setor**, inclusive quem ainda
   * não tem data — o pedido é justamente que preencham.
   *
   * Por isso não fala em "você está escalado": a maioria de quem recebe ainda
   * não está. O link abre a aba onde se responde.
   */
  buildPublished(notice: PublishedNotice): string {
    const versiculo = this.verses.pick(`${notice.scheduleId}:${notice.servantId}:published`);
    const periodo = this.periodo(notice);

    return [
      `Olá, ${primeiroNome(notice.servantName)}!`,
      `A escala *${notice.scheduleName}* já está aberta${periodo}.`,
      ``,
      `*Ministério:* ${notice.ministryName}`,
      `*Setor:* ${notice.sectorName}`,
      ``,
      `Informe os dias em que você pode servir:`,
      ...(this.appUrl ? [`${this.appUrl}/servant?aba=next`] : []),
      ...this.comoEntrar(notice.churchUsername, notice.servantUsername),
      ``,
      `_"${versiculo.text}"_`,
      `— *${versiculo.reference}*`,
      ``,
      `_Mensagem automática do ScaleFlow._`,
    ].join("\n");
  }

  /**
   * Como entrar na conta.
   *
   * Anda junto do link, e some junto com ele: sem endereço para abrir,
   * explicar o login é instrução para lugar nenhum.
   *
   * O `@` é o que decide a tela. Quem cadastrou e-mail entra com ele e a
   * senha, e pronto. Quem entra pelo nome de usuário precisa dizer de qual
   * igreja é, porque `maria` só é única dentro de uma igreja — e o username da
   * igreja é o único dado do login que o servo não tem como adivinhar. O
   * formulário só sabe dizer "peça ao líder se não souber"; escrevê-lo aqui
   * tira esse pedido do caminho.
   */
  private comoEntrar(churchUsername: string, servantUsername: string | null): string[] {
    if (!this.appUrl) return [];

    // Sem username não dá para nomeá-lo, e inventar um seria pior que omitir:
    // a pessoa tentaria entrar com um dado que não existe. Aí a linha só diz
    // o que o formulário vai pedir, que continua sendo verdade.
    const porUsuario = servantUsername
      ? `Ou pelo usuário: *${servantUsername}*, igreja *${churchUsername}*, e sua senha.`
      : `Pelo nome de usuário, o app pede também a igreja — a sua é *${churchUsername}*.`;

    return [
      ``,
      `*Como entrar:* se você cadastrou e-mail, use o e-mail e a senha.`,
      porUsuario,
    ];
  }

  /** `, com 12 datas entre 06/09 e 28/09` — ou vazio, se a escala não tem data. */
  private periodo({ dateCount, firstDate, lastDate }: PublishedNotice): string {
    if (dateCount === 0) return "";
    const dia = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
    const quantas = `${dateCount} ${dateCount === 1 ? "data" : "datas"}`;
    return dateCount === 1
      ? `, com ${quantas} em ${dia(firstDate)}`
      : `, com ${quantas} entre ${dia(firstDate)} e ${dia(lastDate)}`;
  }
}

/**
 * Só o primeiro nome na saudação. "Olá, Maria!" soa como gente; "Olá, Maria
 * Aparecida da Silva Souza!" soa como cobrança de banco.
 */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
