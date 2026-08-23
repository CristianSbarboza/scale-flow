# Plano de Validação & Testes - Telefone de Contato

> [!NOTE]
> **Status:** implementado e migrado (local + produção). Os automatizados rodaram; os manuais **não** — nada foi aberto no navegador nesta sessão.

## 🧪 Testes Automatizados

- **Comando:** `npx tsc --noEmit` — ✅ limpo.
- **Comando:** `npm run lint` — ✅ 3 warnings de baseline.
- **Funções puras de `src/lib/phone.ts`** (máscara progressiva, split por prefixo mais longo, ida e volta, validação, exibição): ✅ 30 casos, todos passando. Rodados por script temporário — **não ficaram no repositório**, porque o projeto não tem framework de teste. Se `phone.ts` mudar, não há rede.
- **Ida e volta pelo banco local** (grava, relê, remonta o seletor): ✅ 7 casos. Também por script temporário.
- **Comando:** `DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx tsx src/db/check-isolation.ts` — **esperado:** continuar passando. O telefone não mexe em isolamento, mas o harness é a rede que avisa se `getOrCreateUser` foi quebrado ao ganhar mais um parâmetro. Resultado: `[preencher]`

---

## 🔤 Normalização (o coração desta spec)

O risco desta feature não é segurança, é formato: o mesmo número gravado de dois jeitos por caminhos diferentes, e ninguém percebe até a primeira busca.

- [x] `(11) 98765-4321` e `11987654321` gravam **o mesmo valor** — verificado pelos dois caminhos de escrita contra o banco: ambos `5511987654321`.
- [x] O código do país **não é digitado** — vem do seletor. Colar "+55 11 98765-4321" no campo faz o `+55` ser tratado como dígitos do número e a validação recusa pelo tamanho. Decisão registrada: país só pelo seletor.
- [x] Fixo de 10 dígitos: máscara `(11) 3456-7890` (corte 4+4) contra celular `(11) 98765-4321` (5+4). Verificado.
- [x] Campo vazio grava `NULL`, não string vazia. Verificado no banco.
- [x] `1198` é recusado nos dois níveis: `validatePhone` na tela e `normalizeStoredPhone` na action. A action é um endpoint POST — validar só na tela não valida nada.
- [x] **Defeito encontrado depois, ao adicionar a edição pelo admin:** `normalizeStoredPhone` só contava dígitos (8 a 15), e um número nacional brasileiro cabe nessa faixa — gravava `11987654321` como se fosse E.164, e o serviço de WhatsApp mandaria mensagem para outra pessoa. Agora exige código de país conhecido com comprimento nacional compatível, mais a regra do NANP (código de área dos EUA nunca começa com 0 ou 1), que é o que barra o DDD 11 de São Paulo. Verificado: recusa `11987654321` e `21987654321`, aceita `5511987654321`, `351912345678` e `14155551234`.
- [x] Todos os caminhos de escrita passam por `normalizeStoredPhone`: `getOrCreateUser` (cadastro de servo e de líder) e `updateOwnPhone` (configurações).

## 🗃️ Migração

Aplicada no local e na **produção** (23/08/2026).

- [x] Contagens antes e depois idênticas: local `users: 10`, produção `users: 11`. O `apply-migration.ts` aborta sozinho se mudarem.
- [x] `ADD COLUMN IF NOT EXISTS` — idempotente por construção.
- [x] Produção conferida depois: coluna `phone`, `text`, `is_nullable = YES`, 11 usuários, **0 com string vazia** (critério 4 — todos ficaram `NULL`, que é o que a tela sabe tratar).

## 🙋 Validação Manual

### 🖥️ Desktop

- [ ] Cadastrar servo **sem** telefone funciona como antes (critério 1). Resultado: `[preencher]`
- [ ] Cadastrar servo **com** telefone: o número aparece formatado na tela de detalhe (critério 2). Resultado: `[preencher]`
- [ ] Servo sem telefone na tela de detalhe: sem rótulo órfão, sem "undefined", sem traço solto. Resultado: `[preencher]`
- [ ] A pessoa edita o próprio telefone nas configurações e o valor persiste. Resultado: `[preencher]`
- [ ] Tema claro e escuro: campo e exibição legíveis nos dois (Constituição, item 4). Resultado: `[preencher]`

### 📱 Mobile

- [ ] O campo abre o **teclado numérico** (`inputMode="numeric"`), não o alfabético. Resultado: `[preencher]`
- [ ] A máscara não atrapalha o apagar: dar backspace sobre um parêntese ou hífen não trava o cursor. Resultado: `[preencher]`
- [ ] O número formatado não quebra o layout da tela de detalhe em tela estreita. Resultado: `[preencher]`

---

## 📸 Evidências

- **Mesmo número por dois caminhos, mesmo valor no banco:** `[colar saída]`
- **Contagem antes/depois da migração:** `[colar saída]`

## ✍️ Notas da implementação

**A máscara abre o parêntese no primeiro dígito** (`1` → `(1`, `11` → `(11`, `119` → `(11) 9`). A primeira versão do teste esperava `1` e `11` crus; o comportamento do código é que estava certo. Conferido que apagar dígito a dígito volta ao vazio sem travar o cursor.

**`splitPhone` casa o prefixo mais longo primeiro.** Sem ordenar por tamanho, `591` (Bolívia) seria lido como `59` — que não existe — ou pior, um código curto engoliria um longo. Um número que não bate com nenhum código conhecido volta inteiro como nacional sob o Brasil, em vez de a tela apagar o que não soube interpretar.

**Máscara só para o Brasil.** Inventar agrupamento para país que não se conhece atrapalha mais que ajuda — quem digita um número italiano sabe como ele se agrupa melhor que este código.

**O que ficou sem rede:** os 37 casos verificados rodaram em scripts temporários, apagados depois. O projeto não tem framework de teste, então uma mudança futura em `phone.ts` não tem nada que a segure. Se algum dia entrar um runner, `src/lib/phone.ts` é o primeiro candidato — é puro, sem I/O, e é onde os erros de formato vão nascer.
