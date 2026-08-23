import express, { type Express } from "express";
import QRCode from "qrcode";
import type { WhatsAppSession } from "../whatsapp/WhatsAppSession.js";
import type { ReminderStore } from "../reminders/types.js";
import type { TickResult } from "../reminders/ReminderScheduler.js";

/**
 * O Express **não** é o caminho da mensagem — quem envia é o cron. Aqui só
 * mora a operação da sessão, e são duas coisas:
 *
 * - `/qr`   parear o número. Sem isso não há como autenticar num host remoto.
 * - `/health` saber se a sessão está viva. Uma sessão caída não dá erro, só
 *   para de mandar; sem esta rota, o primeiro a perceber seria o servo que
 *   faltou no culto.
 *
 * O app Next não chama nada disto. Os dois compartilham o banco e nada mais.
 */
export class ControlServer {
  private readonly app: Express;
  private lastTick: { at: string; result: TickResult } | null = null;

  constructor(
    private readonly session: WhatsAppSession,
    private readonly store: ReminderStore,
    private readonly port: number,
    private readonly log: (line: string) => void = console.log,
  ) {
    this.app = express();
    this.registerRoutes();
  }

  /** Chamado pelo laço a cada ciclo, para o /health mostrar sinal de vida. */
  recordTick(result: TickResult): void {
    this.lastTick = { at: new Date().toISOString(), result };
  }

  listen(): void {
    this.app.listen(this.port, () => this.log(`controle em http://localhost:${this.port}`));
  }

  private registerRoutes(): void {
    this.app.get("/qr", async (_req, res) => {
      const qr = this.session.qr;
      if (!qr) {
        const { state } = this.session.status();
        res.status(409).send(
          state === "connected"
            ? "Já conectado — não há QR para ler."
            : `Sem QR no momento (estado: ${state}). Recarregue em alguns segundos.`,
        );
        return;
      }
      // PNG em vez de texto: o QR do terminal depende de fonte monoespaçada e
      // de contraste que nem todo terminal tem, e a leitura falha em silêncio.
      const png = await QRCode.toBuffer(qr, { width: 320, margin: 2 });
      res.type("png").send(png);
    });

    this.app.get("/health", async (_req, res) => {
      const session = this.session.status();
      let counts: Record<string, number> | { erro: string };
      try {
        counts = await this.store.countByStatus();
      } catch (erro) {
        counts = { erro: erro instanceof Error ? erro.message : String(erro) };
      }

      // Só 200 quando dá para trabalhar. Um monitor externo precisa distinguir
      // "de pé" de "de pé e inútil" — e a sessão caída é exatamente o segundo.
      const saudavel = session.state === "connected";
      res.status(saudavel ? 200 : 503).json({
        healthy: saudavel,
        session,
        lastTick: this.lastTick,
        notificationLog: counts,
      });
    });
  }
}
