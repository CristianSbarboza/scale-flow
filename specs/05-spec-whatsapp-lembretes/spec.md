# Especificação Funcional - Lembretes por WhatsApp

> **Status:** planejado, não iniciado.
> **Depende de:** [04-spec-telefone](../04-spec-telefone/spec.md) — sem número de telefone não há para onde mandar. É pré-requisito duro.

## 🎯 Objetivo

Avisar o servo escalado, pelo WhatsApp, antes de ele precisar servir. Hoje a escala existe no sistema e a pessoa só a vê se entrar nele — o lembrete vai até ela.

Três disparos:

- **Escala publicada** — para **todos os servos do setor**, escalados ou não, pedindo que preencham a disponibilidade. É o único que não depende de estar escalado, porque é justamente o convite para se escalar.
- **Um dia antes, às 09h** — por servo e por data escalada.
- **Duas horas antes do horário do culto** — idem.

## 👤 Requisitos Funcionais

- **RF01** — Os lembretes de véspera e de 2 horas vão para quem está em `schedule_assignments` naquela data, de uma escala com `status = 'published'`. Rascunho não dispara nada.
- **RF08** — O aviso de escala publicada vai para **todos os servos do setor**, e dispara em `schedules.published_at`, não na data do culto. Só vale dentro de uma janela (padrão 48h): sem ela, subir o serviço avisaria de toda escala publicada que já existe.
- **RF02** — A mensagem identifica o ministério/setor, a data e o horário. **Não** traz o nome da igreja: uma pessoa pertence a exatamente uma (`users.church_id` é coluna única, e nenhum vínculo de servo cruza igrejas), então nomeá-la não desfaz ambiguidade nenhuma.
- **RF03** — Servo sem telefone cadastrado é simplesmente pulado, sem erro e sem travar a fila dos outros.
- **RF04** — Cada combinação (data escalada, servo, tipo de lembrete) dispara **no máximo uma vez**, mesmo que o processo reinicie no meio.
- **RF05** — Um lembrete cujo horário já passou quando o processo sobe **não** é enviado com atraso. Lembrete atrasado é pior que lembrete nenhum: "seu culto é em 2 horas" chegando depois do culto destrói a confiança no aviso.
- **RF06** — Falha de envio para um servo não interrompe os demais; fica registrada para consulta.
- **RF07** — Cada mensagem fecha com **um** versículo, do acervo em `whatsapp/src/reminders/VerseBook.ts`. Os dois avisos do mesmo culto nunca trazem o mesmo texto — a pessoa recebe os dois em menos de um dia, e repetir pareceria falha de sistema.

## 🚫 Não Faz Parte

- **Mensagem com a escala completa quando ela for confirmada.** Estava na ideia inicial e saiu desta rodada, por decisão. Fica para uma spec própria. Note que o aviso de escala **publicada** (RF08) é outra coisa: sai quando a escala abre para preenchimento, não quando fecha.
- **Receber mensagens.** O canal é de mão única. Resposta do servo cai no WhatsApp pessoal de quem é dono do número e é tratada na mão.
- **Escolha de horário pelo usuário.** 09h e 2h são fixos. Configurável por igreja é outra spec.
- **Confirmação de presença pelo WhatsApp** ("responda SIM"). Exigiria receber mensagens.

## ⚙️ Decisões tomadas

**Biblioteca não-oficial (Baileys), com o número pessoal do dono do produto.** Decidido com o risco na mesa. O que isso implica, para ficar escrito:

- O Baileys conversa com o WhatsApp por protocolo revertido. Envio automatizado é o padrão que a Meta pune, e a punição é o **banimento do número**.
- Sendo um número pessoal, um ban leva junto a conta pessoal de WhatsApp — não só o envio do sistema.
- Sendo **um número para todas as igrejas**, um ban derruba os lembretes de todas de uma vez. Ponto único de falha.
- As mensagens chegam como vindas de uma pessoa, não de uma empresa. Quem responder vai responder para ela.

A mitigação possível dentro dessa escolha é ritmo: espaçar os envios e nunca disparar em rajada. Não elimina o risco, reduz.

## ✅ Critérios de Aceitação

1. Servo escalado para amanhã recebe uma mensagem às 09h de hoje, com igreja, setor, data e hora corretos.
2. O mesmo servo recebe a segunda mensagem exatamente 2h antes do `start_time` daquela data.
3. Reiniciar o processo entre um disparo e outro **não** gera mensagem repetida.
4. Servo sem telefone não recebe nada e não aparece como erro.
5. Escala em `draft` não dispara nada.
6. Um número inválido registra falha e os outros servos da mesma data recebem normalmente.
7. Subir o processo depois do horário de um lembrete **não** envia aquele lembrete.

## ❓ Decisões em aberto

- **Opt-out.** Não pedido, mas alguém vai querer sair. O mais barato é uma coluna booleana em `users` e um controle nas configurações.
- **Fuso horário.** `schedule_dates.date` e `start_time` não guardam fuso nenhum. Precisa ser fixado como `America/Sao_Paulo` em um lugar só — é o defeito mais provável desta spec inteira.
- **Formato do número.** A spec 04 guarda 10-11 dígitos (padrão nacional). O WhatsApp exige `55` + DDD + número. A conversão precisa de dono, e números antigos sem o nono dígito são o caso chato.
