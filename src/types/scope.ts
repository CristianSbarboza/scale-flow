/**
 * O que a sessão atual alcança.
 *
 * As três dimensões são independentes, não alternativas: um líder pode
 * coordenar um setor de outro ministério, e um servo coordena alguns
 * setores enquanto apenas serve em outros. Modelar isso como variantes
 * mutuamente exclusivas reintroduziria o problema que este tipo resolve.
 *
 * Não existe campo que signifique "veja tudo por omissão". O acesso total
 * do admin é uma checagem deliberada de `role === "admin"` no ponto de uso.
 */
export type Scope = {
  userId: string;
  role: "admin" | "leader" | "servant";
  /** Ministérios que o usuário lidera. Vazio se não lidera nenhum. */
  ledMinistryIds: number[];
  /** Setores onde o usuário é coordenador. Vazio se não coordena nenhum. */
  coordinatedSectorIds: number[];
};
