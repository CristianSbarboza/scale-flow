/**
 * O que a sessão atual alcança.
 *
 * As três dimensões são independentes, não alternativas: um líder pode
 * coordenar um setor de outro ministério, e um servo coordena alguns
 * setores enquanto apenas serve em outros. Modelar isso como variantes
 * mutuamente exclusivas reintroduziria o problema que este tipo resolve.
 *
 * Não existe campo que signifique "veja tudo por omissão". O acesso total
 * do admin é uma checagem deliberada de `role === "admin"` no ponto de uso —
 * e mesmo esse total é sempre dentro de `churchId`.
 */
export type Scope = {
  userId: string;
  role: "admin" | "leader" | "servant";
  /**
   * A igreja do usuário. Diferente das outras dimensões, esta é uma barreira
   * dura: vale para todos os papéis, inclusive admin, e nunca é dispensada.
   * Consulta de ministério/setor/servo/escala sem filtrar por aqui é bug de
   * segurança, não otimização.
   */
  churchId: number;
  /** Ministérios que o usuário lidera. Vazio se não lidera nenhum. */
  ledMinistryIds: number[];
  /** Setores onde o usuário é coordenador. Vazio se não coordena nenhum. */
  coordinatedSectorIds: number[];
};
