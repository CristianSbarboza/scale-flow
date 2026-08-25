import express, { type Express } from "express";
import QRCode from "qrcode";
import type { WhatsAppSession } from "../whatsapp/WhatsAppSession.js";
import type { ReminderKind, ReminderStore, Sender } from "../reminders/types.js";
import type { TickResult } from "../reminders/ReminderScheduler.js";
import type { ReminderMessage } from "../reminders/ReminderMessage.js";
import type { ServiceClock } from "../time/ServiceClock.js";

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
    /** Ausente = a rota de teste nem existe. Ver `registerTestRoute`. */
    private readonly test?: {
      sender: Sender;
      message: ReminderMessage;
      clock: ServiceClock;
      token: string;
    },
  ) {
    this.app = express();
    this.registerRoutes();
    this.registerTestRoute();
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
        testRoute: this.test ? "habilitada" : "desabilitada (defina CONTROL_TOKEN)",
      });
    });
  }

  /**
   * Envia uma mensagem avulsa, para conferir como ela chega antes de confiar
   * no cron.
   *
   * **Só existe com `CONTROL_TOKEN` definido.** Um endpoint que dispara
   * WhatsApp para qualquer número é um relay aberto: quem achasse a URL
   * mandaria mensagem a partir de um número pessoal. Sem token, a rota nem é
   * registrada — responder 401 já confirmaria que ela existe.
   *
   * Não grava em `notification_log`: é teste, não lembrete. Se gravasse,
   * consumiria a reserva e a pessoa não receberia o aviso de verdade depois.
   */
  private registerTestRoute(): void {
    if (!this.test) return;
    const { sender, message, clock, token } = this.test;

    this.app.post("/test-send", async (req, res) => {
      if (req.get("x-control-token") !== token) {
        res.status(404).end();
        return;
      }

      const phone = String(req.query.phone ?? "").replace(/\D/g, "");
      const username = req.query.username ? String(req.query.username) : null;
      const kind = (req.query.kind === "day_before" ? "day_before" : "two_hours") as ReminderKind;

      if (!phone) {
        res.status(400).json({ erro: "informe ?phone= em E.164 sem o +, ex.: 5511987654321" });
        return;
      }

      const contexto = username ? await this.store.findContextByUsername(username) : null;
      if (username && !contexto) {
        res.status(404).json({ erro: `usuário "${username}" não encontrado` });
        return;
      }

      // `date` e `time` permitem reproduzir um culto específico — é o caso de
      // mandar o aviso de um horário que o cron já recusou por atraso. Sem
      // eles, o culto é fabricado a partir de agora, coerente com o tipo de
      // aviso: em 2 horas para o de 2 horas, amanhã para a véspera.
      const agora = clock.now();
      const alvo = new Date(agora.getTime() + (kind === "two_hours" ? 2 : 26) * 60 * 60 * 1000);
      const fmt = (opts: Intl.DateTimeFormatOptions, locale: string) =>
        new Intl.DateTimeFormat(locale, { timeZone: clock.timeZoneName, ...opts }).format(alvo);

      const dateParam = req.query.date ? String(req.query.date) : null;
      const timeParam = req.query.time ? String(req.query.time) : null;
      if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        res.status(400).json({ erro: "date precisa ser YYYY-MM-DD" });
        return;
      }
      if (timeParam && !/^\d{2}:\d{2}$/.test(timeParam)) {
        res.status(400).json({ erro: "time precisa ser HH:MM" });
        return;
      }

      const service = {
        date: dateParam ?? fmt({}, "en-CA"),
        time: timeParam ?? fmt({ hour: "2-digit", minute: "2-digit", hour12: false }, "pt-BR"),
      };

      const texto = message.build({
        dateId: 0,
        servantId: 0,
        phone,
        scheduleName: "Teste",
        servantName: contexto?.servantName ?? "Amigo(a)",
        churchName: contexto?.churchName ?? "ScaleFlow",
        churchUsername: contexto?.churchUsername ?? "sua-igreja",
        ministryName: contexto?.ministryName ?? "—",
        sectorName: contexto?.sectorName ?? "—",
        service,
      }, kind);

      try {
        await sender.send(phone, texto);
        this.log(`teste enviado para +${phone}`);
        res.json({ enviado: true, para: `+${phone}`, kind, texto });
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : String(erro);
        res.status(502).json({ enviado: false, erro: motivo });
      }
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
