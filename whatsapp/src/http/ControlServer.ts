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
    /**
     * Página que se atualiza sozinha.
     *
     * A primeira versão servia o PNG direto, e não funcionava: o Baileys
     * rotaciona o QR a cada poucos segundos, então quem abria a página quase
     * sempre apontava o celular para um código já vencido — e o erro aparecia
     * como "QR refs attempts ended" no log, sem nenhuma pista na tela.
     *
     * Aqui a imagem é recarregada sozinha e a página avisa quando conecta.
     */
    this.app.get("/qr", (_req, res) => {
      res.type("html").send(PAGINA_QR);
    });

    /** O QR atual, em PNG. É o que a página recarrega. */
    this.app.get("/qr.png", async (_req, res) => {
      const qr = this.session.qr;
      if (!qr) {
        res.status(409).end();
        return;
      }
      // PNG em vez do QR de terminal: aquele depende de fonte monoespaçada e
      // de contraste que nem todo terminal tem, e a leitura falha em silêncio.
      const png = await QRCode.toBuffer(qr, { width: 320, margin: 2 });
      res.type("png").set("Cache-Control", "no-store").send(png);
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

/**
 * Página de pareamento. Recarrega o QR sozinha a cada 5 segundos e para
 * quando a sessão conecta.
 *
 * HTML embutido de propósito: o serviço não tem build de front-end, e um
 * arquivo estático a mais só para esta tela seria mais peça para manter do
 * que valor entregue.
 */
const PAGINA_QR = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Parear WhatsApp — ScaleFlow</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#1b1a18; color:#fff; font-family:system-ui,sans-serif; text-align:center; }
  .box { padding:2rem; }
  h1 { font-size:1.25rem; font-weight:600; margin:0 0 .5rem; }
  p { color:#a8a29e; font-size:.875rem; margin:.25rem 0; }
  img { width:320px; height:320px; background:#fff; border-radius:12px; margin:1.5rem 0; display:block; }
  .estado { font-size:.8125rem; color:#f97316; }
  .ok { color:#10b981; font-size:1rem; font-weight:600; }
</style>
</head>
<body>
  <div class="box">
    <h1>Parear WhatsApp</h1>
    <p>No celular: <b>Aparelhos conectados</b> › <b>Conectar um aparelho</b></p>
    <img id="qr" alt="QR code" />
    <p class="estado" id="estado">carregando…</p>
    <p>O código muda sozinho. Não precisa recarregar a página.</p>
  </div>
<script>
  const img = document.getElementById('qr');
  const estado = document.getElementById('estado');
  let parado = false;

  async function atualizar() {
    if (parado) return;
    try {
      const r = await fetch('/health');
      const s = await r.json();
      estado.textContent = 'sessão: ' + s.session.state;
      if (s.session.state === 'connected') {
        parado = true;
        img.remove();
        estado.className = 'ok';
        estado.textContent = '✅ Conectado. Pode fechar esta página.';
        return;
      }
      // A querystring força o navegador a buscar de novo em vez de reusar o
      // PNG anterior do cache.
      img.src = '/qr.png?t=' + Date.now();
    } catch {
      estado.textContent = 'serviço fora do ar';
    }
  }
  atualizar();
  setInterval(atualizar, 5000);
</script>
</body>
</html>`;
