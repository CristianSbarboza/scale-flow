import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";

/**
 * O erro de desconexão do Baileys carrega o código dentro de `output`, no
 * formato do Boom. Lemos a forma aqui em vez de importar `@hapi/boom`: ele só
 * existe como dependência transitiva, e sumiria sem aviso numa atualização.
 */
type ErroComStatus = { output?: { statusCode?: number } };

export type SessionState = "starting" | "awaiting_qr" | "connected" | "disconnected" | "logged_out";

/**
 * A conexão com o WhatsApp: pareamento, reconexão e estado.
 *
 * Mantém o QR code mais recente em memória para o `/qr` servir. Não sabe o que
 * é lembrete — quem envia é o `BaileysSender`, que recebe esta sessão.
 *
 * **Sessão caída é silenciosa**: ela não dá erro, só para de mandar. Por isso
 * o estado é exposto e o `/health` o publica — sem isso, o primeiro a
 * perceber a queda seria o servo que faltou.
 */
export class WhatsAppSession {
  private socket: WASocket | null = null;
  private state: SessionState = "starting";
  private lastQr: string | null = null;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectReason: string | null = null;
  /** Impede duas reconexões simultâneas quando vários eventos chegam juntos. */
  private connecting = false;

  constructor(
    private readonly sessionDir: string,
    private readonly log: (line: string) => void = console.log,
  ) {}

  async start(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      const socket = makeWASocket({
        version,
        auth: state,
        // O QR vai para o /qr, não para o terminal: o processo roda num host
        // remoto onde ninguém está olhando stdout na hora de parear.
        printQRInTerminal: false,
        // Este serviço não lê mensagens (fora de escopo na spec 05). Sem isso,
        // o socket sincroniza o histórico inteiro à toa.
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      this.socket = socket;

      socket.ev.on("creds.update", saveCreds);
      socket.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.lastQr = qr;
          this.setState("awaiting_qr");
        }

        if (connection === "open") {
          this.lastQr = null;
          this.lastConnectedAt = new Date();
          this.lastDisconnectReason = null;
          this.setState("connected");
        }

        if (connection === "close") {
          const status = (lastDisconnect?.error as ErroComStatus | undefined)?.output?.statusCode;
          this.lastDisconnectReason = lastDisconnect?.error?.message ?? `status ${status}`;

          // `loggedOut` é definitivo: o aparelho desvinculou o número. Só um
          // QR novo resolve, e reconectar em laço só gastaria banda.
          if (status === DisconnectReason.loggedOut) {
            this.setState("logged_out");
            this.log("sessão encerrada pelo WhatsApp — é preciso parear de novo em /qr");
            return;
          }

          this.setState("disconnected");
          this.log(`conexão caiu (${this.lastDisconnectReason}) — reconectando em 5s`);
          setTimeout(() => void this.start(), 5000);
        }
      });
    } finally {
      this.connecting = false;
    }
  }

  /**
   * O socket, se estiver pronto para enviar.
   *
   * Devolver `null` em vez de lançar é deliberado: quem chama precisa decidir
   * entre falhar aquele envio e adiar o ciclo inteiro.
   */
  get ready(): WASocket | null {
    return this.state === "connected" ? this.socket : null;
  }

  get qr(): string | null {
    return this.lastQr;
  }

  status() {
    return {
      state: this.state,
      lastConnectedAt: this.lastConnectedAt?.toISOString() ?? null,
      lastDisconnectReason: this.lastDisconnectReason,
      hasQr: this.lastQr !== null,
    };
  }

  private setState(next: SessionState): void {
    if (this.state === next) return;
    this.state = next;
    this.log(`sessão: ${next}`);
  }
}
