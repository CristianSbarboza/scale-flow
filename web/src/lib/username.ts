/**
 * Regra do nome de usuário do servo.
 *
 * **Sempre minúsculo.** O username da igreja já era normalizado desde a spec
 * 03; o da pessoa não era, e isso abria dois buracos:
 *
 * 1. O admin cadastrava `Joao.Silva`, a pessoa digitava `joao.silva` e não
 *    entrava — sem pista nenhuma, porque a mensagem de erro do login é única
 *    de propósito (RNF07).
 * 2. O índice `users_church_username_idx` é sensível a caso, então `joao` e
 *    `Joao` podiam coexistir **na mesma igreja**. Era exatamente o que o
 *    índice existia para impedir.
 *
 * Módulo puro, sem I/O: serve à tela (avisar antes) e à action (garantir).
 */

/** Ponto, hífen e sublinhado no meio; começa e termina em letra ou número. */
const FORMATO = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const MIN = 3;
const MAX = 40;

/** Minúsculo e sem espaço nas pontas. Não valida — só arruma o arrumável. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Mensagem de erro, ou `null` se está bom. Vazio é válido aqui: quem decide
 * se o username é obrigatório é quem chama (servo sim, admin não).
 */
export function validateUsername(input: string): string | null {
  const u = normalizeUsername(input);
  if (!u) return null;

  if (u.length < MIN) return `O usuário precisa ter pelo menos ${MIN} caracteres.`;
  if (u.length > MAX) return `O usuário pode ter no máximo ${MAX} caracteres.`;
  if (/\s/.test(input.trim())) return "O usuário não pode ter espaços. Use ponto: joao.silva";
  if (!FORMATO.test(u)) {
    return "Use apenas letras, números, ponto, hífen e sublinhado — começando e terminando com letra ou número.";
  }
  return null;
}

/**
 * Normaliza para gravar, lançando se não servir.
 *
 * Chame em **toda** action que grava username. A tela avisa antes; esta é a
 * garantia, porque todo export de um módulo `"use server"` é um endpoint POST
 * e recebe o que mandarem.
 */
export function normalizeStoredUsername(input: string | null | undefined): string | null {
  const u = normalizeUsername(input ?? "");
  if (!u) return null;
  const erro = validateUsername(u);
  if (erro) throw new Error(erro);
  return u;
}
