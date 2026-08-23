/**
 * Telefone: normalização, validação e formatação.
 *
 * **O banco guarda E.164 sem o `+`** — código do país colado no número:
 * `5511987654321`. Não guarda máscara, não guarda o país em coluna separada.
 *
 * Guardar formatado transformaria toda busca e comparação futura num problema
 * de string. Guardar só o número nacional obrigaria cada consumidor a lembrar
 * de prefixar o país — e o primeiro que esquecesse mandaria mensagem para o
 * número errado. E.164 é o formato que o WhatsApp consome direto
 * (`5511987654321@s.whatsapp.net`), então a conversão simplesmente não existe.
 */

export interface Country {
  /** Código do país, só dígitos, sem `+`. */
  code: string;
  name: string;
  flag: string;
  /** Quantos dígitos o número nacional pode ter. */
  minDigits: number;
  maxDigits: number;
}

/**
 * Lista curta de propósito: Brasil primeiro, depois os países onde a
 * comunidade brasileira e a lusófona de fato estão. Uma lista com os 195
 * países do mundo faria todo mundo rolar para achar o Brasil, que é o caso de
 * 99% dos cadastros.
 */
export const COUNTRIES: readonly Country[] = [
  { code: "55", name: "Brasil", flag: "🇧🇷", minDigits: 10, maxDigits: 11 },
  { code: "351", name: "Portugal", flag: "🇵🇹", minDigits: 9, maxDigits: 9 },
  { code: "1", name: "EUA / Canadá", flag: "🇺🇸", minDigits: 10, maxDigits: 10 },
  { code: "54", name: "Argentina", flag: "🇦🇷", minDigits: 10, maxDigits: 11 },
  { code: "595", name: "Paraguai", flag: "🇵🇾", minDigits: 9, maxDigits: 9 },
  { code: "598", name: "Uruguai", flag: "🇺🇾", minDigits: 8, maxDigits: 9 },
  { code: "56", name: "Chile", flag: "🇨🇱", minDigits: 9, maxDigits: 9 },
  { code: "591", name: "Bolívia", flag: "🇧🇴", minDigits: 8, maxDigits: 8 },
  { code: "51", name: "Peru", flag: "🇵🇪", minDigits: 9, maxDigits: 9 },
  { code: "57", name: "Colômbia", flag: "🇨🇴", minDigits: 10, maxDigits: 10 },
  { code: "52", name: "México", flag: "🇲🇽", minDigits: 10, maxDigits: 10 },
  { code: "34", name: "Espanha", flag: "🇪🇸", minDigits: 9, maxDigits: 9 },
  { code: "39", name: "Itália", flag: "🇮🇹", minDigits: 9, maxDigits: 10 },
  { code: "44", name: "Reino Unido", flag: "🇬🇧", minDigits: 10, maxDigits: 10 },
  { code: "353", name: "Irlanda", flag: "🇮🇪", minDigits: 9, maxDigits: 9 },
  { code: "244", name: "Angola", flag: "🇦🇴", minDigits: 9, maxDigits: 9 },
  { code: "258", name: "Moçambique", flag: "🇲🇿", minDigits: 9, maxDigits: 9 },
  { code: "81", name: "Japão", flag: "🇯🇵", minDigits: 10, maxDigits: 10 },
];

export const DEFAULT_COUNTRY = "55";

/** Códigos do mais longo para o mais curto: `591` tem que vencer antes de `59`. */
const CODES_BY_LENGTH = [...COUNTRIES]
  .map((c) => c.code)
  .sort((a, b) => b.length - a.length);

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/**
 * Separa o E.164 guardado em país + número nacional, para a tela remontar o
 * seletor e a máscara.
 *
 * Um número que não bate com nenhum código conhecido volta inteiro como
 * nacional, sob o Brasil. Não é chute: é o que evita a tela apagar um número
 * que ela não soube interpretar.
 */
export function splitPhone(e164: string | null | undefined): { country: string; national: string } {
  const digits = onlyDigits(e164 ?? "");
  if (!digits) return { country: DEFAULT_COUNTRY, national: "" };

  for (const code of CODES_BY_LENGTH) {
    if (digits.startsWith(code) && digits.length > code.length) {
      return { country: code, national: digits.slice(code.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, national: digits };
}

/**
 * Máscara de exibição do número nacional.
 *
 * Só o Brasil tem máscara: é o único formato que a maioria vai digitar e
 * reconhecer de cara. Inventar máscara para país que não se conhece atrapalha
 * mais que ajuda — quem digita um número da Itália sabe como ele se agrupa
 * melhor do que este arquivo.
 */
export function formatNational(country: string, national: string): string {
  const d = onlyDigits(national);
  if (country !== "55") return d;

  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  // 9 dígitos = celular (5+4); 8 = fixo (4+4). Abaixo disso ainda está digitando.
  const corte = rest.length > 8 ? 5 : 4;
  if (rest.length <= corte) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, corte)}-${rest.slice(corte)}`;
}

/** Junta país + nacional no que vai para o banco. `null` quando vazio. */
export function toE164(country: string, national: string): string | null {
  const d = onlyDigits(national);
  return d ? `${onlyDigits(country)}${d}` : null;
}

/**
 * Valida o número nacional. Devolve a mensagem de erro, ou `null` se está bom.
 *
 * Vazio é válido: o telefone é opcional para todos os papéis (RF01 da spec 04).
 */
export function validatePhone(country: string, national: string): string | null {
  const d = onlyDigits(national);
  if (!d) return null;

  const { name, minDigits, maxDigits } = getCountry(country);
  if (d.length < minDigits || d.length > maxDigits) {
    const esperado = minDigits === maxDigits
      ? `${minDigits} dígitos`
      : `${minDigits} ou ${maxDigits} dígitos`;
    return `Número de ${name} precisa ter ${esperado} (sem o código do país).`;
  }
  if (country === "55" && d.length === 11 && d[2] !== "9") {
    return "Celular brasileiro com 11 dígitos precisa começar com 9 depois do DDD.";
  }
  return null;
}

/** Como o número aparece em tela de leitura: `+55 (11) 98765-4321`. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const { country, national } = splitPhone(e164);
  return `+${country} ${formatNational(country, national)}`.trim();
}

/**
 * Normaliza o que vem do cliente antes de gravar.
 *
 * Chame isto em **toda** action que grava telefone. A máscara do `PhoneField`
 * é conforto de digitação, não garantia: a action é um endpoint POST e recebe
 * o que mandarem. Devolve `null` para vazio, e lança se o número for curto ou
 * comprido demais para ser um telefone.
 */
export function normalizeStoredPhone(input: string | null | undefined): string | null {
  const digits = onlyDigits(input ?? "");
  if (!digits) return null;

  // Faixa do próprio E.164: nunca mais de 15 dígitos contando o país.
  if (digits.length > 15) throw new Error("Número de telefone inválido.");

  // Precisa começar com um código de país conhecido e ter comprimento
  // nacional compatível com ele. A primeira versão só contava dígitos (8 a
  // 15) — e um número nacional brasileiro sem o `55` cabia nessa faixa, então
  // gravava algo que não era E.164 e o serviço de WhatsApp mandaria mensagem
  // para outra pessoa.
  const { country, national } = splitPhone(digits);
  const { minDigits, maxDigits } = getCountry(country);
  let casa = digits.startsWith(country)
    && national.length >= minDigits
    && national.length <= maxDigits;

  // Regra do NANP (+1): código de área e prefixo nunca começam com 0 ou 1.
  // Está aqui por um motivo específico — um celular de São Paulo sem o `55`
  // (`11987654321`) casa com "+1" e um nacional de 10 dígitos. Esta linha o
  // rejeita, e São Paulo é o DDD mais provável de aparecer.
  if (casa && country === "1" && !/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
    casa = false;
  }

  if (!casa) {
    throw new Error(
      "Número de telefone inválido. Informe com o código do país (ex.: 55 para o Brasil)."
    );
  }
  return digits;
}

/**
 * LIMITE CONHECIDO: a validação não consegue, em geral, distinguir um número
 * nacional que por acaso seja válido sob o código de outro país. Os casos
 * brasileiros estão cobertos — DDDs que começam com 2 a 9 não casam com código
 * nenhum da lista, e o DDD 11 é barrado pela regra do NANP —, mas a garantia
 * de verdade é de origem: `PhoneField` é o único produtor de telefone na
 * interface, e ele sempre monta o E.164 completo. Quem escrever uma action que
 * receba telefone de outro lugar precisa saber disto.
 */
