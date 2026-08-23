# Plano Técnico - Lembretes por WhatsApp

> **Status:** planejado, não iniciado.

## 🛠️ Arquitetura

### O Express não é o caminho da mensagem

A ideia inicial era "um servidor Express para ligar o Baileys". Vale inverter a leitura: **quem envia é um cron dentro do processo, lendo o banco direto.** O Express existe para operar a sessão do WhatsApp, não para receber pedidos do Next.

| Peça | Para quê |
| :--- | :--- |
| `GET /qr` | Mostrar o QR code para parear o WhatsApp. Sem isso não há como autenticar. |
| `GET /health` | Dizer se a sessão está viva. Uma sessão caída é silenciosa — ninguém percebe até a escala passar em branco. |
| cron interno | O trabalho de verdade: a cada minuto, procurar lembretes vencidos e enviar. |

O Next **não chama** este serviço. Os dois compartilham o banco e nada mais. Isso evita autenticação entre serviços, evita o Next precisar saber que o worker existe, e faz os lembretes continuarem funcionando com a Vercel fora do ar.

### Onde mora

Processo Node separado, sempre ligado — VPS, Railway, Fly ou Render **com disco persistente**. A Vercel não serve: o Baileys mantém um WebSocket vivo e grava o estado de autenticação em arquivo, e função serverless morre entre requisições.

Sugestão: pasta `services/whatsapp/` neste mesmo repositório, reaproveitando `src/db/schema.ts`. Deploy é separado do Next; o que se ganha é uma definição de schema só.

### Tabela nova

```ts
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  dateId: integer("date_id").references(() => scheduleDates.id, { onDelete: "cascade" }).notNull(),
  servantId: integer("servant_id").references(() => servants.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind", { enum: ["day_before", "two_hours"] }).notNull(),
  status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
  detail: text("detail"),          // motivo, quando falhou ou foi pulado
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (t) => [
  // É esta linha que garante o RF04. Idempotência conferida pelo banco, não
  // pela lógica: se o processo morrer entre enviar e registrar, a tentativa
  // seguinte esbarra aqui. Marcar ANTES de enviar troca "mandar duas vezes"
  // por "às vezes não mandar" — e mensagem repetida é pior.
  uniqueIndex("notification_log_unique").on(t.dateId, t.servantId, t.kind),
]);
```

## 📋 Lista de Tarefas

### Fase 1: Fundação

- [ ] Tabela `notification_log` em `src/db/schema.ts` + SQL em `drizzle/manual/`.
- [ ] `services/whatsapp/` com `package.json` próprio, `@whiskeysockets/baileys` e a conexão ao mesmo `DATABASE_URL`.
- [ ] Sessão com `useMultiFileAuthState` apontando para um **volume persistente**. Se a pasta se perder, o QR precisa ser lido de novo — e ninguém descobre isso sozinho.

### Fase 2: Fuso e número (onde os bugs moram)

- [ ] Um único módulo resolvendo `date` + `start_time` → instante real em `America/Sao_Paulo`. Nenhum outro arquivo faz aritmética de data. Este é o defeito mais provável da spec inteira.
- [ ] Conversão para JID do WhatsApp: dígitos → `55` + DDD + número → `<numero>@s.whatsapp.net`. Tratar o nono dígito ausente em números antigos.
- [ ] Validar o número **antes** de enviar (`onWhatsApp()` do Baileys) e registrar `skipped` se não existir, em vez de estourar.

### Fase 3: O cron

- [ ] A cada minuto, buscar as datas cuja janela de disparo caiu, juntando `schedule_assignments` → `servants` → `users` (com telefone) e filtrando `schedules.status = 'published'`.
- [ ] `LEFT JOIN notification_log` para excluir quem já recebeu — a consulta já devolve só quem falta.
- [ ] **Janela de tolerância, não igualdade.** Disparar entre 0 e ~15 min de atraso. Sem janela, um minuto de indisponibilidade pula o lembrete de vez; com janela grande demais, volta o problema do lembrete atrasado (RF05). Fora da janela, gravar `skipped` com o motivo — assim some do relatório sem sumir do histórico.
- [ ] Enviar em série, com intervalo aleatório de alguns segundos entre mensagens. Rajada é o sinal mais forte de automação que existe.
- [ ] Registrar `sent` ou `failed` com o motivo. Falha de um não interrompe os outros (RF06).

### Fase 4: Operação

- [ ] `GET /qr` (imagem ou terminal) e `GET /health` com estado da sessão e horário do último envio bem-sucedido.
- [ ] Log em arquivo ou stdout com data, servo e resultado.
- [ ] Alerta quando a sessão cair. Uma sessão morta não dá erro — ela só para de mandar, e o primeiro a perceber seria o servo que faltou.

### Fase 5: Fechamento

- [ ] Preencher [validation.md](./validation.md).
- [ ] `npx tsc --noEmit` e `npm run lint` limpos nos dois projetos.
- [ ] Aplicar a migração da tabela nova na produção.

## 📊 Superfície da mudança

| Área | Observação |
| :--- | :--- |
| Banco | Uma tabela, com o índice único fazendo o trabalho pesado |
| Serviço novo | `services/whatsapp/` — Baileys, cron, dois endpoints |
| Infraestrutura | **A parte nova de verdade:** host sempre ligado, disco persistente, pareamento por QR, monitoramento |
| App Next | Nenhuma mudança. Os dois só compartilham o banco. |

O código é pequeno. O peso está em operar um processo com sessão viva, e em duas armadilhas silenciosas: **fuso horário** e **sessão caída sem ninguém saber**.
