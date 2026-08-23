export interface Verse {
  text: string;
  reference: string;
}

/**
 * Acervo de versículos que fecham a mensagem.
 *
 * Lista definida pelo dono do produto, toda em torno de servir, na **NVI**.
 * Um item chegou com erro de transcrição e está corrigido com nota no próprio
 * item; o resto está exatamente como veio.
 *
 * Para trocar ou acrescentar, mexa só aqui: `VerseBook` não conhece o
 * conteúdo, e o resto do serviço não conhece a lista.
 */
export const DEFAULT_VERSES: readonly Verse[] = [
  {
    text: "Irmãos, vocês foram chamados para a liberdade. Mas não usem a liberdade para dar ocasião à vontade da carne; ao contrário, sirvam uns aos outros mediante o amor.",
    reference: "Gálatas 5:13",
  },
  {
    text: "Cada um exerça o dom que recebeu para servir aos outros, administrando fielmente a graça de Deus em suas múltiplas formas.",
    reference: "1 Pedro 4:10",
  },
  {
    text: "Tudo o que fizerem, façam-no de todo o coração, como para o Senhor, e não para os homens, sabendo que receberão do Senhor a recompensa da herança. É a Cristo, o Senhor, que vocês estão servindo.",
    reference: "Colossenses 3:23-24",
  },
  {
    text: "Ao contrário, quem quiser tornar-se importante entre vocês deverá ser servo, e quem quiser ser o primeiro deverá ser servo dos demais, tal como o Filho do homem",
    reference: "Mateus 20:26-28",
  },
  {
    text: "Se, porém, não lhes agrada servir ao Senhor, escolham hoje a quem irão servir... Mas eu e a minha família serviremos ao Senhor.",
    reference: "Josué 24:15",
  },
  {
    // A lista chegou DUAS VEZES com "os Doze chamaram e disseram-lhes", que
    // inverte quem fala — não há a quem o "lhes" se refira. Quem chama os
    // Doze é Jesus. Texto reposto conforme a NVI, que foi a versão pedida.
    text: "Sentando-se, Jesus chamou os Doze e disse: Se alguém quiser ser o primeiro, será o último e o servo de todos.",
    reference: "Marcos 9:35",
  },
  {
    text: "Sirvam com boa vontade, como ao Senhor, e não aos homens.",
    reference: "Efésios 6:7",
  },
  {
    text: "Se alguém me serve, siga-me; e onde estou, ali estará também o meu servo. Aquele que me serve, meu Pai o honrará.",
    reference: "João 12:26",
  },
  {
    text: "E não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos. Portanto, enquanto temos oportunidade, façamos o bem a todos, especialmente aos da família da fé.",
    reference: "Gálatas 6:9-10",
  },
  {
    text: "Mas, acima de tudo, temam o Senhor e o sirvam com fidelidade e de todo o coração; considerem quão grandes coisas ele fez por vocês.",
    reference: "1 Samuel 12:24",
  },
];

/**
 * Escolhe um versículo por mensagem.
 *
 * **Não usa `Math.random()`**, e isso é deliberado: a escolha vem de um hash
 * da própria mensagem (data + servo + tipo de aviso). Duas consequências que
 * valem mais que o acaso puro:
 *
 * 1. O mesmo lembrete reenviado traz o mesmo versículo. Com sorteio de
 *    verdade, uma repetição por falha entregaria dois textos diferentes e a
 *    pessoa acharia que são dois avisos distintos.
 * 2. Dá para verificar sem injetar gerador de número aleatório.
 *
 * Para quem recebe, continua parecendo sorteado — dois servos do mesmo dia
 * recebem versículos diferentes, e o aviso de véspera difere do de 2 horas.
 */
export class VerseBook {
  constructor(private readonly verses: readonly Verse[] = DEFAULT_VERSES) {
    if (verses.length === 0) throw new Error("O acervo de versículos não pode ficar vazio.");
  }

  get size(): number {
    return this.verses.length;
  }

  /**
   * `avoid` evita repetir o mesmo versículo em dois avisos do mesmo culto.
   *
   * Sem isso, a véspera e as 2 horas caem no mesmo item em 1 de cada
   * `size` casos — com 10 versículos, 10% das pessoas recebiam o texto
   * idêntico duas vezes em menos de um dia, o que parece falha de sistema.
   * Cair no vizinho é suficiente: continua determinístico.
   */
  pick(seed: string, avoid?: Verse): Verse {
    const i = fnv1a(seed) % this.verses.length;
    const escolhido = this.verses[i];
    if (!avoid || this.verses.length === 1 || escolhido.reference !== avoid.reference) {
      return escolhido;
    }
    return this.verses[(i + 1) % this.verses.length];
  }
}

/** FNV-1a de 32 bits. Pequeno, sem dependência, e espalha bem para este uso. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // `Math.imul` mantém a multiplicação em 32 bits; sem ele o número estoura
    // a precisão de double e o espalhamento degrada.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
