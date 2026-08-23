# Plano Técnico - Lembretes por WhatsApp

> **Status:** implementado em 23/08/2026. Nunca conectado a um WhatsApp real — ver validation.md.

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

### Orientação a objetos

O serviço é escrito em **POO**: classes com dependências entrando pelo construtor, não módulos de funções soltas.

A razão aqui é concreta. As duas partes que mais vão errar nesta spec são o **cálculo de fuso** e a decisão de **"este lembrete está vencido?"** — e nenhuma das duas deveria precisar de WhatsApp conectado nem de esperar o relógio para ser verificada. Com injeção por construtor, o `ReminderScheduler` recebe um `Clock` falso e um `Sender` falso, e o teste vira aritmética.

Por isso o agendador depende de **interfaces**, nunca de Baileys ou de `pg` direto:

```ts
interface Sender    { send(jid: string, text: string): Promise<void>; }
interface Clock     { now(): Date; }
interface ReminderStore {
  findDue(kind: ReminderKind, window: TimeWindow): Promise<DueReminder[]>;
  markSent(r: DueReminder, status: SendStatus, detail?: string): Promise<void>;
}
```

### Classes

```text
src/
  index.ts                    Composition root: instancia tudo e liga. O ÚNICO
                              arquivo que conhece as implementações concretas.
  config/Env.ts               Env — lê e valida as variáveis na subida, não no
                              primeiro uso. Faltando DATABASE_URL, o processo
                              não deve subir e só descobrir às 09h.
  time/ServiceClock.ts        ServiceClock — date + start_time + America/Sao_Paulo
                              → instante. Implementa Clock. Nenhuma outra classe
                              faz aritmética de data.
  reminders/
    ReminderKind.ts           "day_before" | "two_hours" e a regra de quando cada
                              um vence.
    ReminderScheduler.ts      ReminderScheduler — o laço. Recebe store, sender e
                              clock. Não sabe o que é Baileys nem o que é SQL.
    ReminderRepository.ts     ReminderRepository implements ReminderStore — as
                              consultas e o notification_log.
    ReminderMessage.ts        ReminderMessage — monta o texto. Pura.
  whatsapp/
    WhatsAppSession.ts        WhatsAppSession — conexão Baileys, QR, reconexão,
                              estado. Emite quando cai.
    BaileysSender.ts          BaileysSender implements Sender — envia com
                              intervalo entre mensagens. Rajada é o sinal mais
                              forte de automação.
  http/ControlServer.ts       ControlServer — Express com /qr e /health.
```

**`index.ts` é o único lugar que conhece as classes concretas.** Todo o resto recebe o que precisa pelo construtor — é o que permite trocar `BaileysSender` por um dublê no teste sem tocar no agendador.

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

- [x] Tabela `notification_log` em `src/db/schema.ts` + SQL em `drizzle/manual/`.
- [x] `services/whatsapp/` com `package.json` próprio, `@whiskeysockets/baileys` e a conexão ao mesmo `DATABASE_URL`.
- [x] Sessão com `useMultiFileAuthState` apontando para um **volume persistente**. Se a pasta se perder, o QR precisa ser lido de novo — e ninguém descobre isso sozinho.

### Fase 2: Fuso e número (onde os bugs moram)

- [x] Um único módulo resolvendo `date` + `start_time` → instante real em `America/Sao_Paulo`. Nenhum outro arquivo faz aritmética de data. Este é o defeito mais provável da spec inteira.
- [x] Conversão para JID do WhatsApp: dígitos → `55` + DDD + número → `<numero>@s.whatsapp.net`. Tratar o nono dígito ausente em números antigos.
- [x] Validar o número **antes** de enviar (`onWhatsApp()` do Baileys) e registrar `skipped` se não existir, em vez de estourar.

### Fase 3: O cron

- [x] A cada minuto, buscar as datas cuja janela de disparo caiu, juntando `schedule_assignments` → `servants` → `users` (com telefone) e filtrando `schedules.status = 'published'`.
- [x] `LEFT JOIN notification_log` para excluir quem já recebeu — a consulta já devolve só quem falta.
- [x] **Janela de tolerância, não igualdade.** Disparar entre 0 e ~15 min de atraso. Sem janela, um minuto de indisponibilidade pula o lembrete de vez; com janela grande demais, volta o problema do lembrete atrasado (RF05). Fora da janela, gravar `skipped` com o motivo — assim some do relatório sem sumir do histórico.
- [x] Enviar em série, com intervalo aleatório de alguns segundos entre mensagens. Rajada é o sinal mais forte de automação que existe.
- [x] Registrar `sent` ou `failed` com o motivo. Falha de um não interrompe os outros (RF06).

### Fase 4: Operação

- [x] `GET /qr` (imagem ou terminal) e `GET /health` com estado da sessão e horário do último envio bem-sucedido.
- [x] Log em arquivo ou stdout com data, servo e resultado.
- [x] Alerta quando a sessão cair. Uma sessão morta não dá erro — ela só para de mandar, e o primeiro a perceber seria o servo que faltou.

### Fase 5: Fechamento

- [x] Preencher [validation.md](./validation.md).
- [x] `npx tsc --noEmit` e `npm run lint` limpos nos dois projetos.
- [x] Migração aplicada na produção em 23/08/2026: `notification_log` com 7 colunas, índice único `(date_id, servant_id, kind)`, FKs em cascade e o índice de `sent_at`. Contagens preservadas.

## ✍️ O que mudou em relação ao plano

**A ordem de gravação virou reserva-e-envia.** O plano dizia para registrar *depois* de enviar, argumentando que mensagem repetida incomoda menos que lembrete que não chega. Mas a própria validação prometia que duas instâncias simultâneas não duplicam — e com marcação posterior as duas mandariam antes de qualquer uma registrar. As duas coisas não podiam ser verdade.

Ficou: `INSERT ... ON CONFLICT DO NOTHING` com status `pending`, envio, e depois `UPDATE`. O preço é uma linha ficar `pending` se o processo morrer entre reservar e enviar — resolvido no mesmo comando, que reaproveita reserva parada há mais de 5 minutos, ainda dentro da janela de tolerância. Um status novo (`pending`) entrou no schema; a coluna é `text` sem CHECK, então não exigiu migração nova.

**`@hapi/boom` não foi importado.** O erro de desconexão do Baileys traz o código em formato Boom, e o pacote está instalado — mas só como dependência transitiva. Importá-lo direto quebraria sem aviso numa atualização do Baileys, então a forma é declarada localmente em três linhas.

**A conversão de telefone para JID virou uma linha.** Era item da Fase 2 do plano. Como a spec 04 passou a guardar E.164, `BaileysSender` só precisa tirar não-dígitos e perguntar ao `onWhatsApp()`. Nono dígito e código de país deixaram de ser problema deste serviço.

**Um `Env` apareceu.** Não estava no plano, mas validar variáveis no primeiro uso significaria descobrir que falta `DATABASE_URL` às 09h, com o processo "no ar" havia horas. Valida na subida, inclusive se o fuso existe — fuso inválido deixaria toda conta de horário silenciosamente errada.

**`npm run check` ficou no repositório.** As 22 verificações rodam sem rede, sem banco e sem WhatsApp, porque o agendador recebe relógio, banco e remetente pelo construtor. Foi exatamente isto que a POO comprou aqui, e diferente das specs 03 e 04 — onde os testes rodaram em scripts temporários e foram apagados — desta vez existe rede para a próxima mudança.

## 📊 Superfície da mudança

| Área | Observação |
| :--- | :--- |
| Banco | Uma tabela, com o índice único fazendo o trabalho pesado |
| Serviço novo | `services/whatsapp/` — Baileys, cron, dois endpoints |
| Infraestrutura | **A parte nova de verdade:** host sempre ligado, disco persistente, pareamento por QR, monitoramento |
| App Next | Nenhuma mudança. Os dois só compartilham o banco. |

O código é pequeno. O peso está em operar um processo com sessão viva, e em duas armadilhas silenciosas: **fuso horário** e **sessão caída sem ninguém saber**.
