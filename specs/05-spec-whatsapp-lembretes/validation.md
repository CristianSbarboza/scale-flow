# Plano de Validação & Testes - Lembretes por WhatsApp

> [!NOTE]
> **Status:** implementado. As 22 verificações automatizadas passam. **Nada foi testado contra um WhatsApp real** — conectar exige um telefone lendo o QR.

> [!IMPORTANT]
> Testar **sempre com números próprios**. Um teste de lembrete é uma mensagem real chegando no celular de uma pessoa real — e um erro de fuso manda "seu culto é em 2 horas" às 3 da manhã para a igreja inteira.

## 🧪 Automatizado

- **Comando:** `npx tsc --noEmit` nos dois projetos — ✅ limpo.
- **Comando:** `npm run check` em `whatsapp/` — ✅ **22 casos**, sem rede, sem banco e sem WhatsApp. Ficou no repositório: diferente das specs 03 e 04, onde a verificação rodou em script temporário e foi apagada, aqui existe rede para a próxima mudança.
  - [x] Culto 19:00 → lembrete de 2h às 17:00 do mesmo dia
  - [x] Culto 19:00 do dia 10 → lembrete de véspera às 09:00 do dia 9
  - [x] Culto 00:30 → lembrete de 2h cai às 22:30 do **dia anterior** (o instante **e** a leitura local são conferidos: confundir os dois foi o que quebrou este teste na primeira tentativa)
  - [x] Horário de verão: verificado com `America/New_York` nos dois lados da virada de 03/2026 (-5 e -4). Prova que não há `-03:00` escrito em lugar nenhum — o deslocamento sai da base IANA via `Intl`.
  - [x] Véspera independe da hora do culto; viradas de mês, ano e ano bissexto
- **SQL do `ReminderRepository` contra o banco local** — ✅ 10 casos (script temporário, não ficou): servo sem telefone não entra, quem já recebeu sai da fila, o outro tipo de aviso continua pendente, rascunho não dispara, e a segunda reserva é recusada pelo índice único.

## ⏰ Disparo e idempotência

Verificados com dublês (relógio, banco e remetente falsos) e com o SQL real:

- [x] Às 09:00 em ponto sai **uma** mensagem; às 08:59 nenhuma.
- [x] Três ciclos seguidos = uma mensagem só (critério 3).
- [x] Duas instâncias sobre o mesmo banco = uma mensagem só. **É o caso que mudou o desenho:** a ordem original (registrar depois de enviar) falhava aqui.
- [x] Escala em `draft` não dispara (critério 5) — conferido no SQL real.
- [x] Passada a tolerância de 15 min, nada é enviado e fica `skipped` com o motivo (critério 7).
- [x] Servo sem telefone não entra na fila e os outros da mesma data recebem (critérios 4 e 6).
- [x] Falha de envio registra `failed` com o motivo e **não** interrompe a fila.
- [ ] Derrubar o processo **no instante do envio**, com Baileys real, e subir de novo. Resultado: `[preencher]`

## 💬 Conteúdo

- [x] A mensagem traz igreja, ministério/setor, data e hora corretos (RF02).
- [x] A saudação usa só o primeiro nome — "Olá, Maria!" soa como gente; o nome completo soa como cobrança de banco.
- [ ] Nome com acento e emoji renderizados no WhatsApp de verdade. Resultado: `[preencher]`
- [ ] Servo escalado em **duas** datas no mesmo dia recebe dois lembretes coerentes. Resultado: `[preencher]`

## 🔌 Sessão e operação

- [ ] `GET /qr` parea um número novo do zero. Resultado: `[preencher]`
- [ ] Reiniciar o processo **não** pede QR de novo (estado persistiu no volume). Resultado: `[preencher]`
- [ ] Apagar o volume força o QR — confirmando que é ali que o estado mora. Resultado: `[preencher]`
- [ ] Desconectar o aparelho pelo WhatsApp: `GET /health` acusa a queda **antes** de a próxima escala passar em branco. Resultado: `[preencher]`
- [ ] Intervalo entre mensagens: conferir nos logs que não saem em rajada. Resultado: `[preencher]`

## 📸 Evidências

- **Print das duas mensagens chegando nos horários certos:** `[colar]`
- **`notification_log` depois de um dia de operação:** `[colar]`

## ✍️ Notas da implementação

**A contradição que o plano tinha.** O comentário do schema mandava registrar *depois* de enviar (mensagem repetida incomoda menos que lembrete que não chega), e a validação prometia que duas instâncias não duplicam. As duas não podiam ser verdade. Resolvido com reserva atômica: `INSERT ... ON CONFLICT DO NOTHING` com `pending`, envia, depois `UPDATE`. O buraco que sobra — morrer entre reservar e enviar — é fechado no mesmo comando, que reaproveita reserva parada há mais de 5 minutos.

**O caso de teste que quebrou primeiro** foi "culto às 00:30". Escrevi a expectativa como `2026-08-22T22:30Z`, confundindo hora local com UTC — o correto é `2026-08-23T01:30Z`, que *é* 22:30 do dia 22 em São Paulo. O teste agora confere o instante **e** a leitura local, justamente porque foi essa confusão que falhou.

**Nada disto tocou um WhatsApp de verdade.** O Baileys foi verificado só na superfície da API (`onWhatsApp`, `sendMessage`, `useMultiFileAuthState`, `DisconnectReason` existem e têm as assinaturas usadas). Conectar exige um telefone lendo o QR. Tudo que depende da conexão real — pareamento, reconexão após queda, persistência do volume, formatação no aparelho — continua por verificar.
