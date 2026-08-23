export interface Verse {
  text: string;
  reference: string;
}

/**
 * Acervo de versículos que fecham a mensagem.
 *
 * Lista definida pelo dono do produto, toda em torno de servir. Dois itens
 * chegaram com erro de transcrição e estão corrigidos com nota no próprio
 * item — o resto está como veio, inclusive a escolha de tradução.
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
    // A lista original chegou com "todo o qual quiser a\nntre vós ser grande",
    // quebra de colagem. Reposto conforme a ACF, mantendo a mesma tradução.
    text: "Não será assim entre vós; mas todo aquele que quiser entre vós fazer-se grande, seja vosso serviçal; e qualquer que entre vós quiser ser o primeiro, seja vosso servo; bem como o Filho do Homem não veio para ser servido, mas para servir, e para dar a sua vida em resgate de muitos.",
    reference: "Mateus 20:26-28",
  },
  {
    text: "Porém, se vos parece mal aos vossos olhos servir ao Senhor, escolhei hoje a quem sirvais... porém eu e a minha casa serviremos ao Senhor.",
    reference: "Josué 24:15",
  },
  {
    // Original: "os doze chamaram e disseram-lhes" — invertia quem fala.
    // Quem chama e fala é Jesus.
    text: "E ele, assentando-se, chamou os doze e disse-lhes: Se alguém quiser ser o primeiro, seja o derradeiro de todos e o servo de todos.",
    reference: "Marcos 9:35",
  },
  {
    text: "Sirvam com boa vontade, como ao Senhor, e não aos homens.",
    reference: "Efésios 6:7",
  },
  {
    text: "Se alguém me serve, siga-me, e onde eu estiver, ali estará também o meu servo. E, se alguém me servir, meu Pai o honrará.",
    reference: "João 12:26",
  },
  {
    text: "E não nos cansemos de fazer o bem, a seu tempo ceifaremos, se não houvermos desfalecido. Portanto, enquanto temos tempo, façamos o bem a todos, mas principalmente aos domésticos da fé.",
    reference: "Gálatas 6:9-10",
  },
  {
    text: "Tão-somente temei ao Senhor, e servi-o com fidelidade de todo o vosso coração; porque vede quão grandes coisas tem feito por vós.",
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
