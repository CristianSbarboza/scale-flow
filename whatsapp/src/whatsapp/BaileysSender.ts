import type { Sender } from "../reminders/types.js";
import type { WhatsAppSession } from "./WhatsAppSession.js";

/**
 * Envia pelo WhatsApp. Única classe que traduz telefone em JID.
 *
 * A tradução é trivial porque o banco já guarda E.164 sem o `+`
 * (`5511987654321`) — decisão da spec 04, tomada justamente de olho nisto.
 * Se o telefone fosse guardado em formato nacional, esta classe precisaria
 * saber de código de país e nono dígito.
 */
export class BaileysSender implements Sender {
  constructor(
    private readonly session: WhatsAppSession,
    private readonly log: (line: string) => void = console.log,
  ) {}

  isReady(): boolean {
    return this.session.ready !== null;
  }

  async send(phone: string, text: string): Promise<void> {
    const socket = this.session.ready;
    if (!socket) throw new Error("sessão do WhatsApp não está conectada");

    const digits = phone.replace(/\D/g, "");
    if (!digits) throw new Error("telefone vazio");

    // Confere se o número existe no WhatsApp antes de mandar. Disparar para
    // número inexistente é justamente o comportamento que a Meta lê como
    // automação — e o número aqui é pessoal.
    const [found] = (await socket.onWhatsApp(digits)) ?? [];
    if (!found?.exists) {
      throw new Error(`número não está no WhatsApp: +${digits}`);
    }

    await socket.sendMessage(found.jid, { text });
    this.log(`→ ${found.jid}`);
  }
}
