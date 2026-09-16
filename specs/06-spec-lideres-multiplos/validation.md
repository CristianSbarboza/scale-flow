# Plano de Validação & Testes - Líderes Múltiplos por Ministério

> [!NOTE]
> **Status:** implementado; migração **não aplicada** (nem local, nem produção). Não havia Postgres local nesta sessão — `docker` não está instalado nesta WSL e a porta 5432 está fechada. Os manuais **não** rodaram.

## 🧪 Testes Automatizados

- **Comando:** `npx tsc --noEmit -p tsconfig.json` — ✅ limpo.
- **Comando:** `npm run lint` — ✅ só os 2 warnings de baseline (`next-auth.d.ts`).
- **Comando:** `npm run build` — ✅.
- **Comando:** `DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" npx tsx src/db/check-isolation.ts` — **esperado:** continuar passando. Os 20 casos exercitam `requireXAccess`, que agora passam por `ledBy`. Resultado: `[preencher]`
- **Migração no local:** `[preencher]` — aplicar duas vezes; a segunda deve passar sem tocar em nada.

## 🔐 Autorização (o coração desta spec)

O risco aqui é um predicado esquecido. `grep -rn "leaderId" web/src` deve devolver **zero** linhas de código (só comentários).

- [ ] Líder A do ministério X, líder B recém-adicionado a X: B vê setores, servos e escalas de X. Não vê Y.
- [ ] Líder de Y chama `addMinistryLeader(idDeX, ...)` — recusado.
- [ ] Líder de outra igreja chama `addMinistryLeader(idDeX, ...)` — recusado pela barreira de igreja, antes do ramo de papel.
- [ ] `removeMinistryLeader` com um líder só — "precisa ter ao menos um líder".
- [ ] `removeMinistryLeader` de quem não lidera — "não lidera este ministério".
- [ ] Adicionar e-mail que já lidera — `unchanged: true`, sem linha nova.
- [ ] Adicionar e-mail de servo da igreja — entra e o `role` sobe para `leader`.
- [ ] Adicionar e-mail de outra igreja — recusado por `getOrCreateUser`.

## 🙋 Validação Manual (Checklist)

### 🖥️ Desktop
- [ ] `/admin/ministries/[id]`: um líder → rótulo "Líder", sem X. Dois → "Líderes", X em cada um.
- [ ] Adicionar com e-mail novo mostra o painel de senha uma vez.
- [ ] `/admin/ministries`: coluna "Líderes" com nomes separados por vírgula; busca pelo nome do segundo líder encontra o ministério.
- [ ] `/admin/sectors/[id]`: lista todos os líderes do ministério.
- [ ] `/admin`: "Líderes: A, B" nos últimos ministérios.
- [ ] Nome de setor longo sem espaço no card de setores: quebra dentro do card, não vaza (correção que entrou junto).

### 📱 Mobile
- [ ] Card de líderes: avatar, nome, e-mail e X cabem em 360px sem cortar.

## 🗃️ Migração

- [ ] Local: aplicada, contagens iguais, `ministry_leaders` com uma linha por ministério.
- [ ] Produção: `[data]`.
