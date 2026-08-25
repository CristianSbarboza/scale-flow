import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { rm } from "node:fs/promises";
import { quietLogger } from "./quietLogger.js";

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
  /** Idem, para o recomeço do zero depois de um logout. */
  private repairing = false;

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
        // Sem isto o pino do Baileys despeja um JSON por handshake e enterra
        // as mensagens do próprio serviço.
        logger: quietLogger(),
        // Mais folga para ler o QR antes de ele rodar. O padrão dá pouco
        // tempo para quem precisa abrir a página, olhar o celular e apontar.
        qrTimeout: 90_000,
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
        // Um socket já substituído continua emitindo: sem esta linha, o `close`
        // atrasado do socket velho derruba o estado do novo logo depois da
        // troca — e o QR recém-emitido some da tela sem explicação.
        if (this.socket !== socket) return;

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
          // QR novo resolve, e reconectar com a credencial morta só levaria
          // outro logout — daí o recomeço do zero em vez de um `start()` seco.
          if (status === DisconnectReason.loggedOut) {
            this.setState("logged_out");
            this.log("sessão encerrada pelo WhatsApp — descartando credenciais para gerar um QR novo");
            void this.repair();
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
   * Recomeça do zero depois de um logout: joga fora as credenciais e sobe um
   * socket novo, que aí sim emite QR.
   *
   * Apagar `sessionDir` é o passo que faltava. Com a credencial morta ainda no
   * disco, o Baileys tenta *retomar* a sessão e toma outro logout em vez de
   * emitir um QR — então o `/qr.png` respondia 409 para sempre, embora a
   * mensagem do log mandasse ir justamente lá parear.
   *
   * Só roda em `loggedOut`, que é quando o aparelho já desvinculou o número:
   * não existe credencial boa para se perder aqui.
   */
  private async repair(): Promise<void> {
    if (this.repairing) return;
    this.repairing = true;

    try {
      // Antes do `rm`: com `socket` nulo, a guarda lá em cima passa a ignorar
      // o que o socket velho ainda emitir durante a troca.
      this.socket = null;
      this.lastQr = null;

      await rm(this.sessionDir, { recursive: true, force: true });
      // Uma pausa curta para o caso de o pareamento novo também falhar com
      // 401: sem ela, a recuperação vira um laço quente de apagar e subir.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.start();
    } catch (erro) {
      this.log(`falha ao recomeçar a sessão: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      this.repairing = false;
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
