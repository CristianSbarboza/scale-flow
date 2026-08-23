# Plano Técnico - Telefone de Contato

> **Status:** implementado em 23/08/2026. Falta só aplicar a migração na produção.

## 🛠️ Modelo de Dados

Uma coluna, anulável, em `users`:

```ts
// src/db/schema.ts, dentro de pgTable("users", { ... })
phone: text("phone"),
```

Anulável e **sem índice único**: o campo é opcional (RF01) e um número pode pertencer a mais de uma pessoa (marido e esposa, telefone fixo da família).

Guardar **só os dígitos**. A máscara é assunto da interface; no banco, `11987654321`. Guardar formatado transformaria qualquer busca ou comparação futura em problema de string.

## 📋 Lista de Tarefas

### Fase 1: Banco

- [x] `src/db/schema.ts`: adicionar `phone: text("phone")` em `users`.
- [x] Migração. **Se a migração da spec 03 ainda não tiver ido para a produção, acrescentar a coluna ao mesmo arquivo** (`drizzle/manual/001_multi_igreja.sql`) e a produção sofre uma migração só. Caso contrário, criar `drizzle/manual/002_telefone.sql` com `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;` — idempotente, sem backfill, sem `NOT NULL`, sem lock relevante.
- [x] `src/db/seed.ts`: telefone nos usuários do fixture (inclusive **um sem telefone**, senão o caminho nulo nunca é exercitado).

### Fase 2: Normalização

- [x] `src/lib/phone.ts`: `normalizePhone(input): string | null` (tira tudo que não é dígito; devolve `null` se vazio) e `formatPhone(digits): string` (`(11) 98765-4321`, com o caso de 10 dígitos para fixo).
- [x] Validação: 10 ou 11 dígitos. Menos que isso é erro com mensagem clara (critério 5), não gravação pela metade.
- [x] Normalizar **no servidor**, dentro das actions — não confiar na máscara do cliente. A máscara é conforto; a garantia é do servidor.

### Fase 3: Escrita

- [x] `getOrCreateUser()` em `src/lib/scope.ts` passa a aceitar telefone no `identifier`. É por onde servos e líderes nascem.
- [x] `createServant` e a edição de servo em `src/lib/actions/servants.ts`.
- [x] `createMinistry` (cria o líder) em `src/lib/actions/ministries.ts`.
- [x] `src/lib/actions/account.ts`: ação para a pessoa editar o próprio telefone.

### Fase 4: Interface

- [x] `src/components/ui/PhoneField.tsx`: `Field` com máscara ao digitar, `type="tel"`, `inputMode="numeric"`, `autoComplete="tel"`.
- [x] Formulário de cadastro de servo (`/admin/servants`) — rótulo "Telefone (opcional)", como o e-mail já faz.
- [x] Formulário de cadastro de ministério (`/admin/ministries`), no bloco do líder.
- [x] Tela de detalhe do servo (`/admin/servants/[id]`): exibir formatado; quando vazio, não deixar rótulo órfão na tela.
- [x] `src/components/settings/ProfileSection.tsx` ou seção nova: a pessoa edita o próprio número. Vale nas duas telas de configuração (página do admin e modal do servo) — as seções são compartilhadas desde a spec 02.

### Fase 5: Fechamento

- [x] `npx tsc --noEmit` limpo e `npm run lint` no baseline (3 warnings pré-existentes).
- [x] Preencher [validation.md](./validation.md).
- [x] Migração aplicada na produção em 23/08/2026: `phone text` anulável, 11 usuários preservados, todos com `NULL` (nenhuma string vazia).

## ✍️ O que mudou em relação ao plano

**O seletor de país virou requisito, e isso mudou o formato de armazenamento.** O plano dizia "guardar só os dígitos nacionais". Com país escolhível, passou a ser E.164 sem o `+` (`5511987654321`). Ver a spec para o raciocínio — e o efeito colateral bom: a pendência de conversão da spec 05 morreu antes de nascer.

**`Select` ganhou duas props, ambas por necessidade real desta tela.** `short` (rótulo curto no gatilho: a lista mostra "🇧🇷 +55 Brasil", o gatilho só "🇧🇷 +55" — sem isso, um seletor de 116px trunca justamente a parte que identifica o país) e `listClassName` (a lista herdava `w-full` do gatilho e ficaria com 116px de largura). As duas são aditivas; nenhum uso existente muda.

**`getOrCreateUser` preenche telefone faltante, mas não sobrescreve.** Quem já informou o próprio número sabe melhor do que o formulário de quem está adicionando essa pessoa a mais um setor.

**O país mora no estado do `PhoneField`, não é derivado do valor.** Derivar a cada render apagaria a escolha de quem seleciona Portugal antes de digitar: sem dígitos não há E.164, sem E.164 o `splitPhone` devolve o padrão, e o seletor pularia sozinho de volta para o Brasil.

## 📊 Superfície da mudança

| Área | Arquivos | Observação |
| :--- | :--- | :--- |
| Banco | `schema.ts`, `seed.ts`, um `.sql` | Uma coluna anulável — a parte trivial |
| Normalização | `lib/phone.ts` | Novo; é onde mora a regra |
| Actions | `scope.ts`, `servants.ts`, `ministries.ts`, `account.ts` | Sempre normalizar no servidor |
| Telas | `PhoneField`, 2 formulários, detalhe do servo, configurações | O volume está aqui |

**~12 arquivos.** Risco baixo: campo opcional, sem `NOT NULL`, sem backfill, sem interação com autenticação. O erro provável não é de segurança, é de formato — telefone gravado com máscara em um caminho e sem máscara em outro, e ninguém percebe até a primeira busca.
