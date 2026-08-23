# scaleflow-whatsapp

Lembretes de escala por WhatsApp. Especificação em
[`specs/05-spec-whatsapp-lembretes/`](../specs/05-spec-whatsapp-lembretes/spec.md).

## Por que é um processo separado

O Baileys mantém um WebSocket vivo e grava o estado de autenticação em disco.
Função serverless morre entre requisições, então isto **não** cabe na Vercel
junto do `web/`: precisa de host sempre ligado e **volume persistente**. Se a
pasta de sessão se perder, o pareamento por QR precisa ser refeito.

## O Express não é o caminho da mensagem

Quem envia é um cron dentro do processo, lendo o banco direto. O Express serve
para operar a sessão:

| Rota | Para quê |
| :--- | :--- |
| `GET /qr` | Parear o WhatsApp. Sem isto não há como autenticar. |
| `GET /health` | Dizer se a sessão está viva. Sessão caída é silenciosa. |

O `web/` **não chama** este serviço. Os dois compartilham o banco e nada mais.
Assim não há autenticação entre serviços, e os lembretes continuam funcionando
com a Vercel fora do ar.

## Orientação a objetos

Este serviço é escrito em **POO**: classes, com dependências entrando pelo
construtor. O `ReminderScheduler` depende das interfaces `Sender`, `Clock` e
`ReminderStore` — nunca de Baileys ou de `pg` direto.

Não é preferência de estilo. As duas partes que mais vão errar aqui são o
cálculo de fuso e a decisão de "este lembrete está vencido?", e nenhuma das
duas deveria precisar de WhatsApp conectado nem de esperar o relógio para ser
verificada. Com injeção por construtor, o teste vira aritmética.

`src/index.ts` é o **único** arquivo que conhece as implementações concretas.

Ver o desenho das classes em
[`tasks.md`](../specs/05-spec-whatsapp-lembretes/tasks.md).

## Ambiente

Precisa do próprio `.env` com o mesmo `DATABASE_URL` do `web/` — cada processo
lê o seu; o Next só enxerga o `.env` da própria pasta.

## Estado

Esqueleto. Nada implementado ainda — ver o checklist em
[`tasks.md`](../specs/05-spec-whatsapp-lembretes/tasks.md).
