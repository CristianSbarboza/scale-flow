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

## Rodando

```bash
cp .env.example .env      # ajuste o DATABASE_URL
npm install
npm run check             # 22 verificações, sem rede e sem banco
npm run dev               # sobe o serviço
```

Depois abra `http://localhost:3100/qr` e leia o código no WhatsApp
(**Aparelhos conectados**). `GET /health` responde 200 só quando a sessão está
conectada — 503 serve para um monitor externo distinguir "de pé" de "de pé e
inútil".

**No primeiro dia em produção, use `DRY_RUN=true`.** Ele decide tudo e grava no
`notification_log`, mas não envia — dá para conferir quem receberia antes de
mandar de verdade.

## Verificação

`npm run check` cobre fuso horário (inclusive um fuso com horário de verão, para
provar que não há `-03:00` escrito em lugar nenhum), a janela de disparo, envio
único com duas instâncias, falha que não derruba a fila, e o texto da mensagem.

O que **não** cobre: o Baileys de verdade. Conectar exige um telefone lendo o
QR, e não há como automatizar isso.

## Estado

Implementado, **nunca conectado a um WhatsApp real**. Ver
[`validation.md`](../specs/05-spec-whatsapp-lembretes/validation.md) para o que
falta verificar.
