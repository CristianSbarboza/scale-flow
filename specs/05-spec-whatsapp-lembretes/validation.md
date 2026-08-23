# Plano de Validação & Testes - Lembretes por WhatsApp

> [!NOTE]
> **Status: planejado, nada executado.**

> [!IMPORTANT]
> Testar **sempre com números próprios**. Um teste de lembrete é uma mensagem real chegando no celular de uma pessoa real — e um erro de fuso manda "seu culto é em 2 horas" às 3 da manhã para a igreja inteira.

## 🧪 Automatizado

- **Comando:** `npx tsc --noEmit` nos dois projetos — **esperado:** limpo. Resultado: `[preencher]`
- **Teste do módulo de fuso**, sem rede e sem WhatsApp: `date` + `start_time` → instante esperado em `America/Sao_Paulo`. É a única parte pura desta spec e a que mais erra. Resultado: `[preencher]`
  - [ ] Culto 19:00 → lembrete de 2h às 17:00 do mesmo dia
  - [ ] Culto 19:00 do dia 10 → lembrete de véspera às 09:00 do dia 9
  - [ ] Culto 00:30 → lembrete de 2h cai às 22:30 do **dia anterior**
  - [ ] Horário de verão: se voltar a existir, o cálculo não pode deslizar uma hora

## ⏰ Disparo e idempotência

- [ ] Escala publicada com data amanhã: às 09h chega **uma** mensagem. Resultado: `[preencher]`
- [ ] Reiniciar o processo entre os dois lembretes não gera repetição (critério 3). Resultado: `[preencher]`
- [ ] Derrubar o processo **no instante do envio** e subir de novo: no máximo uma mensagem. Resultado: `[preencher]`
- [ ] Rodar duas instâncias ao mesmo tempo por engano: o índice único segura, sem mensagem dobrada. Resultado: `[preencher]`
- [ ] Escala em `draft` não dispara (critério 5). Resultado: `[preencher]`
- [ ] Subir o processo **depois** do horário do lembrete: nada é enviado, e fica `skipped` no log (critério 7). Resultado: `[preencher]`
- [ ] Servo sem telefone: nada enviado, sem erro, os outros da mesma data recebem (critérios 4 e 6). Resultado: `[preencher]`
- [ ] Número inválido: registra `failed` e não interrompe a fila. Resultado: `[preencher]`

## 💬 Conteúdo

- [ ] A mensagem traz igreja, ministério/setor, data e hora corretos (RF02). Resultado: `[preencher]`
- [ ] Nome com acento e emoji não quebram a formatação. Resultado: `[preencher]`
- [ ] Servo escalado em **duas** datas no mesmo dia recebe dois lembretes coerentes, não um confuso. Resultado: `[preencher]`

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

`[Registrar o que fugiu do plano.]`
