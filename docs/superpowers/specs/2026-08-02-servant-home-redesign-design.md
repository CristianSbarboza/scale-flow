# Redesenho da área do servo (`/servant`)

Data: 2026-08-02
Status: Aprovado

## Contexto

Hoje `/servant` (`src/app/servant/page.tsx`) é uma única lista estática: um grid de cards "confirmado" seguido de um grid de "disponibilidades enviadas". Não há calendário, não há visão por escala, e não há indicação de quais escalas do setor o servo ainda não respondeu. O objetivo é redesenhar essa área para dar ao servo três formas de enxergar sua participação: um calendário do mês com os dias confirmados em destaque, uma lista das escalas do mês, e uma lista de todas as escalas do seu setor — todas indicando se ele já enviou disponibilidade ou não.

## Escopo

**Dentro do escopo:** a página `/servant` inteira (abaixo do cabeçalho existente, que não muda). Uma nova server action de leitura. Três visões navegáveis por abas + um modal de dia (calendário) e um modal de detalhe de escala.

**Fora do escopo:** qualquer mudança no fluxo de submissão de disponibilidade (`/escala/[link]`, `AvailabilityForm`) ou no lado admin/líder. Não há biblioteca de datas nova — o projeto não usa nenhuma (`date-fns`, `dayjs` etc.) e o calendário é simples o bastante (grade de mês, sem recorrência/fuso) para não justificar a dependência.

## Estrutura

`src/app/servant/page.tsx` continua como server component: busca sessão, o registro de `servant` (com setor/ministério) e os dados via a nova action, e passa tudo para um componente client (`ServantHome`, novo, em `src/components/ServantHome.tsx`) que controla a navegação entre abas por estado local — sem troca de rota.

Três abas: **Calendário** (padrão ao entrar), **Escalas do Mês**, **Todas as Escalas**. Navegação por abas fixas: barra inferior fixa em telas estreitas (padrão mobile, alcance de polegar); no desktop as mesmas abas ficam no topo do conteúdo, abaixo do cabeçalho. O breakpoint segue o mesmo espírito mobile-first já usado no design system (por volta de 640px).

## Fonte de dados

Nova função em `src/lib/actions.ts`: `getServantOverview()` (lê a sessão internamente, como as outras actions). Busca todas as `schedules` do setor do servo logado (mesmo escopo do link público de disponibilidade), com suas `scheduleDates`, e cruza cada data com:
- `confirmed: boolean` — existe `scheduleAssignments` desse servo para essa data;
- `available: boolean` — existe `scheduleAvailability` desse servo para essa data.

Essa única estrutura (`{ schedule, dates: [{ id, date, startTime, confirmed, available }] }[]`) alimenta as três abas e os dois modais, evitando múltiplas queries divergentes.

## Aba Calendário

Grade de mês construída manualmente (native `Date`, sem lib): cabeçalho com nome do mês/ano e setas para mês anterior/próximo; grade de 7 colunas com os dias, preenchendo os espaços vazios do início/fim do mês. Dias com pelo menos uma data `confirmed: true` (cruzando todas as escalas do overview) recebem destaque visual (verde `#10b981`, mesma cor semântica já usada para "CONFIRMADO" no resto do app). Clicar num dia destacado abre um modal listando, para aquele dia, cada confirmação: nome da escala, ministério · setor, horário — cobre o caso (raro) de mais de uma confirmação no mesmo dia. Dias sem confirmação não são clicáveis.

## Abas "Escalas do Mês" / "Todas as Escalas"

Lista de cards, um por escala (não por data): nome da escala, ministério · setor, contagem de datas, e um chip de status — **"Preenchido"** (verde) se o servo tem `available: true` em qualquer data dessa escala, senão **"Pendente"** (laranja/accent). "Escalas do Mês" filtra para escalas com ao menos uma data no mês atualmente exibido pelo calendário (mês corrente por padrão); "Todas as Escalas" lista sem esse filtro. Clicar em qualquer card (em qualquer uma das duas abas) abre o modal de detalhe da escala.

## Modal de detalhe de escala

Reaproveita o padrão visual já estabelecido nos modais de Escalas do admin (`.card.glass`, tokens de `var(--radius)`/`var(--border)`, sem os valores "inventados" que já corrigimos ali). Mostra nome da escala, ministério · setor, e uma lista de todas as datas dessa escala com o status desse servo em cada uma: **Confirmado** / **Disponibilidade enviada (aguardando confirmação)** / **Não enviado**.

## Responsivo

Grade do calendário em CSS Grid com `minmax`/`clamp` para células e fonte reduzirem em telas estreitas sem quebrar o layout de 7 colunas. Abaixo do breakpoint mobile, a navegação de abas vira barra fixa no rodapé (`position: fixed`, `bottom: 0`), com o conteúdo da aba ativa ganhando `padding-bottom` suficiente para não ficar coberto por ela.

## Validação

Sem suíte de testes automatizados no projeto — validação manual: login como `servo.teste`, conferir o calendário do mês atual contra os dados semeados (ou criados manualmente via admin/líder), abrir o modal de dia num dia confirmado, alternar entre as 3 abas, conferir os chips Preenchido/Pendente batendo com o que foi enviado via link público, abrir o modal de detalhe de uma escala e testar em viewport mobile (DevTools) e desktop.
