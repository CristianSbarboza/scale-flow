/**
 * Lembretes de escala por WhatsApp — spec 05.
 *
 * **Composition root.** Este é o único arquivo que conhece implementações
 * concretas: instancia `BaileysSender`, `ReminderRepository` e `ServiceClock`
 * e as injeta em quem depende só das interfaces. Se outra classe começar a dar
 * `new` numa implementação concreta, a testabilidade que motivou a POO aqui
 * já foi embora.
 */
import "dotenv/config";
import pg from "pg";
import { Env } from "./config/Env.js";
import { ServiceClock } from "./time/ServiceClock.js";
import { ReminderRepository } from "./reminders/ReminderRepository.js";
import { ReminderScheduler } from "./reminders/ReminderScheduler.js";
import { WhatsAppSession } from "./whatsapp/WhatsAppSession.js";
import { BaileysSender } from "./whatsapp/BaileysSender.js";
import { ControlServer } from "./http/ControlServer.js";

const TICK_MS = 60_000;

async function main(): Promise<void> {
  const env = Env.load();
  console.log(`scaleflow-whatsapp`);
  console.log(`  banco:  ${env.redactedDatabase}`);
  console.log(`  fuso:   ${env.timeZone}`);
  console.log(`  sessão: ${env.sessionDir}`);
  if (env.dryRun) console.log(`  DRY_RUN ativo — decide e registra, mas não envia.`);

  const pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });

  const clock = new ServiceClock(env.timeZone);
  const store = new ReminderRepository(pool);
  const session = new WhatsAppSession(env.sessionDir);
  const sender = new BaileysSender(session);

  const scheduler = new ReminderScheduler(store, sender, clock, {
    toleranceMinutes: env.toleranceMinutes,
    lookbackHours: env.lookbackHours,
    lookaheadHours: env.lookaheadHours,
    sendDelayMinMs: env.sendDelayMinMs,
    sendDelayMaxMs: env.sendDelayMaxMs,
    dryRun: env.dryRun,
  });

  const control = new ControlServer(session, store, env.port);
  control.listen();
  await session.start();

  /**
   * Um ciclo por vez. `setInterval` dispararia por cima de um ciclo que ainda
   * está esperando o intervalo entre mensagens — e aí duas execuções tentariam
   * o mesmo lembrete. A reserva no banco seguraria, mas melhor não chegar lá.
   */
  let rodando = false;
  const tick = async () => {
    if (rodando) return;
    rodando = true;
    try {
      // Sem sessão não adianta reservar: reservar e falhar gastaria a
      // tentativa e deixaria a linha `pending` por 5 minutos à toa.
      if (!sender.isReady() && !env.dryRun) return;

      const resultado = await scheduler.tick();
      control.recordTick(resultado);
      if (resultado.sent || resultado.failed || resultado.skipped) {
        console.log(`ciclo: ${JSON.stringify(resultado)}`);
      }
    } catch (erro) {
      // Um ciclo que estoura não pode derrubar o processo: o próximo minuto
      // tenta de novo, e a reserva no banco impede envio duplicado.
      console.error("erro no ciclo:", erro instanceof Error ? erro.message : erro);
    } finally {
      rodando = false;
    }
  };

  setInterval(() => void tick(), TICK_MS);
  void tick();

  const encerrar = async (sinal: string) => {
    console.log(`\n${sinal} — encerrando`);
    await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => void encerrar("SIGINT"));
  process.on("SIGTERM", () => void encerrar("SIGTERM"));
}

main().catch((erro) => {
  console.error("falha na subida:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
