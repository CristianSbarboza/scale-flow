/**
 * Verificações do serviço, sem rede, sem banco e sem WhatsApp.
 *
 *   npm run check
 *
 * É isto que a orientação a objetos comprou: o `ReminderScheduler` recebe
 * relógio, banco e remetente pelo construtor, então dá para perguntar "às 09h
 * de segunda, quem serve na terça recebe?" sem esperar segunda-feira.
 *
 * Sai com código 1 se algo falhar, para poder entrar em CI.
 */
import { ServiceClock } from "../time/ServiceClock.js";
import { ReminderScheduler } from "../reminders/ReminderScheduler.js";
import { VerseBook, DEFAULT_VERSES } from "../reminders/VerseBook.js";
import { ControlServer } from "../http/ControlServer.js";
import type { WhatsAppSession } from "../whatsapp/WhatsAppSession.js";
import type {
  DueReminder,
  ReminderKind,
  ReminderStore,
  SendStatus,
  Sender,
} from "../reminders/types.js";

const TZ = "America/Sao_Paulo";
let falhas = 0;

function eq(label: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : `\n     obtido:   ${JSON.stringify(obtido)}\n     esperado: ${JSON.stringify(esperado)}`}`);
}

/** Relógio parado numa hora escolhida. */
class FakeClock extends ServiceClock {
  constructor(private readonly fixo: Date) {
    super(TZ);
  }
  override now(): Date {
    return this.fixo;
  }
}

/** Banco em memória, com a mesma regra de exclusão do LEFT JOIN real. */
class FakeStore implements ReminderStore {
  readonly log = new Map<string, { status: string; detail?: string }>();
  constructor(private readonly candidatos: DueReminder[]) {}

  private key(r: DueReminder, kind: ReminderKind) {
    return `${r.dateId}:${r.servantId}:${kind}`;
  }
  async findCandidates(kind: ReminderKind): Promise<DueReminder[]> {
    return this.candidatos.filter((c) => !this.log.has(this.key(c, kind)));
  }
  async findContextByUsername() {
    return null;
  }
  async claim(r: DueReminder, kind: ReminderKind): Promise<number | null> {
    const k = this.key(r, kind);
    if (this.log.has(k)) return null;
    this.log.set(k, { status: "pending" });
    return [...this.log.keys()].indexOf(k) + 1;
  }
  async finish(claimId: number, status: SendStatus, detail?: string): Promise<void> {
    const k = [...this.log.keys()][claimId - 1];
    this.log.set(k, { status, detail });
  }
  async countByStatus(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const v of this.log.values()) out[v.status] = (out[v.status] ?? 0) + 1;
    return out;
  }
}

class FakeSender implements Sender {
  readonly enviados: string[] = [];
  constructor(private readonly falharPara: string[] = []) {}
  isReady() {
    return true;
  }
  async send(phone: string, text: string): Promise<void> {
    if (this.falharPara.includes(phone)) throw new Error("número não está no WhatsApp");
    this.enviados.push(`${phone}|${text.length}`);
  }
}

function servo(over: Partial<DueReminder> = {}): DueReminder {
  return {
    dateId: 1,
    servantId: 1,
    servantName: "Maria Aparecida Souza",
    phone: "5511987654321",
    churchName: "Igreja Somos Um",
    ministryName: "Multimídia",
    sectorName: "Transmissão",
    scheduleName: "Agosto/2026",
    service: { date: "2026-08-23", time: "19:00:00" },
    ...over,
  };
}

/** `local` é hora de parede em São Paulo. */
function em(local: string): Date {
  const [d, t] = local.split(" ");
  return new ServiceClock(TZ).toInstant({ date: d, time: t });
}

function montar(now: Date, candidatos: DueReminder[], falharPara: string[] = [], dryRun = false) {
  const store = new FakeStore(candidatos);
  const sender = new FakeSender(falharPara);
  const scheduler = new ReminderScheduler(store, sender, new FakeClock(now), {
    toleranceMinutes: 15,
    lookbackHours: 48,
    lookaheadHours: 48,
    sendDelayMinMs: 0,
    sendDelayMaxMs: 0,
    dryRun,
  }, () => {});
  return { store, sender, scheduler };
}

async function main() {
  console.log("--- fuso horário ---");
  {
    const c = new ServiceClock(TZ);
    eq("19:00 em SP = 22:00Z", c.toInstant({ date: "2026-08-23", time: "19:00:00" }).toISOString(), "2026-08-23T22:00:00.000Z");
    eq("véspera às 09h locais", c.dueAt({ date: "2026-03-10", time: "19:00:00" }, "day_before").toISOString(), "2026-03-09T12:00:00.000Z");
    eq("véspera independe da hora do culto",
      c.dueAt({ date: "2026-08-23", time: "19:00" }, "day_before").toISOString(),
      c.dueAt({ date: "2026-08-23", time: "07:00" }, "day_before").toISOString());
    eq("dia anterior a 01/03 em ano bissexto", c.dayBefore("2028-03-01"), "2028-02-29");
    eq("dia anterior a 01/01 vira o ano", c.dayBefore("2026-01-01"), "2025-12-31");

    // A prova de que não há `-03:00` escrito em lugar nenhum: um fuso que
    // AINDA tem horário de verão precisa dar deslocamentos diferentes dos dois
    // lados da virada. Se o Brasil voltar a ter, isto continua certo.
    const ny = new ServiceClock("America/New_York");
    eq("NY antes da virada de DST (-5)", ny.toInstant({ date: "2026-03-07", time: "12:00" }).toISOString(), "2026-03-07T17:00:00.000Z");
    eq("NY depois da virada de DST (-4)", ny.toInstant({ date: "2026-03-09", time: "12:00" }).toISOString(), "2026-03-09T16:00:00.000Z");
  }

  console.log("\n--- janela de disparo (véspera às 09h) ---");

  // Culto 23/08 19:00. Véspera vence 22/08 às 09:00.
  {
    const { scheduler, sender } = montar(em("2026-08-22 08:59"), [servo()]);
    const r = await scheduler.tick();
    eq("08:59 — ainda não venceu", { sent: r.sent, waiting: r.waiting, enviados: sender.enviados.length }, { sent: 0, waiting: 2, enviados: 0 });
  }
  {
    const { scheduler, sender } = montar(em("2026-08-22 09:00"), [servo()]);
    const r = await scheduler.tick();
    eq("09:00 em ponto — envia", { sent: r.sent, enviados: sender.enviados.length }, { sent: 1, enviados: 1 });
  }
  {
    const { scheduler, sender } = montar(em("2026-08-22 09:14"), [servo()]);
    const r = await scheduler.tick();
    eq("09:14 — dentro da tolerância, envia", { sent: r.sent, enviados: sender.enviados.length }, { sent: 1, enviados: 1 });
  }
  {
    const { scheduler, sender, store } = montar(em("2026-08-22 09:20"), [servo()]);
    const r = await scheduler.tick();
    const registro = store.log.get("1:1:day_before");
    eq("09:20 — atrasado, NÃO envia (RF05)", { skipped: r.skipped, enviados: sender.enviados.length, status: registro?.status }, { skipped: 1, enviados: 0, status: "skipped" });
  }

  console.log("\n--- janela de disparo (2 horas antes) ---");
  {
    const { scheduler, sender } = montar(em("2026-08-23 17:00"), [servo()]);
    const r = await scheduler.tick();
    eq("17:00 para culto 19:00 — envia", { sent: r.sent, enviados: sender.enviados.length }, { sent: 1, enviados: 1 });
  }
  {
    // Culto 00:30 do dia 23 -> aviso 22:30 do dia 22.
    const madrugada = servo({ service: { date: "2026-08-23", time: "00:30:00" } });
    const { scheduler } = montar(em("2026-08-22 22:30"), [madrugada]);
    const r = await scheduler.tick();
    eq("culto 00:30 — aviso na véspera às 22:30", r.sent, 1);
  }

  console.log("\n--- envio único ---");
  {
    const { scheduler, sender } = montar(em("2026-08-22 09:00"), [servo()]);
    await scheduler.tick();
    await scheduler.tick();
    await scheduler.tick();
    eq("três ciclos seguidos = uma mensagem só", sender.enviados.length, 1);
  }
  {
    // Duas instâncias sobre o MESMO banco: a reserva é que segura.
    const store = new FakeStore([servo()]);
    const s1 = new FakeSender();
    const s2 = new FakeSender();
    const opts = { toleranceMinutes: 15, lookbackHours: 48, lookaheadHours: 48, sendDelayMinMs: 0, sendDelayMaxMs: 0, dryRun: false };
    const clock = new FakeClock(em("2026-08-22 09:00"));
    await new ReminderScheduler(store, s1, clock, opts, () => {}).tick();
    await new ReminderScheduler(store, s2, clock, opts, () => {}).tick();
    eq("duas instâncias, uma mensagem só", s1.enviados.length + s2.enviados.length, 1);
  }

  console.log("\n--- falhas não param a fila (RF06) ---");
  {
    const ruim = servo({ servantId: 1, phone: "5511000000000", servantName: "Sem WhatsApp" });
    const bom = servo({ servantId: 2, phone: "5511987654321", servantName: "Com WhatsApp" });
    const { scheduler, sender, store } = montar(em("2026-08-22 09:00"), [ruim, bom], ["5511000000000"]);
    const r = await scheduler.tick();
    eq("um falha, o outro recebe", { sent: r.sent, failed: r.failed, enviados: sender.enviados.length }, { sent: 1, failed: 1, enviados: 1 });
    eq("o motivo da falha fica gravado", store.log.get("1:1:day_before")?.detail, "número não está no WhatsApp");
  }

  console.log("\n--- dry run ---");
  {
    const { scheduler, sender } = montar(em("2026-08-22 09:00"), [servo()], [], true);
    const r = await scheduler.tick();
    eq("decide e registra, mas não envia", { sent: r.sent, enviados: sender.enviados.length }, { sent: 1, enviados: 0 });
  }

  console.log("\n--- mensagem ---");
  {
    const { scheduler, sender } = montar(em("2026-08-22 09:00"), [servo()]);
    await scheduler.tick();
    eq("uma mensagem montada", sender.enviados.length, 1);
    const { ReminderMessage } = await import("../reminders/ReminderMessage.js");
    const texto = new ReminderMessage(new ServiceClock(TZ)).build(servo(), "day_before");
    eq("saudação usa só o primeiro nome", texto.includes("Olá, Maria!"), true);
    // Sem cabeçalho de igreja. Uma pessoa pertence a exatamente uma igreja
    // (`users.church_id` é coluna única, e o check-isolation garante que
    // nenhum vínculo cruza igrejas), então dizer o nome dela na mensagem
    // nunca desfaz ambiguidade nenhuma — só ocupa duas linhas.
    eq("abre pela saudação, sem cabeçalho de igreja", texto.startsWith("Olá, "), true);
    eq("traz a hora em negrito", texto.includes("às *19:00*."), true);
    eq("não traz a data por extenso", texto.includes("23/08"), false);
    eq("não repete o nome da escala", texto.includes("*Escala:*"), false);
    eq("sem APP_URL, não sai linha de link", texto.includes("acesse sua conta"), false);

    const comLink = new ReminderMessage(new ServiceClock(TZ), undefined, "https://app.exemplo.com/");
    const t2 = comLink.build(servo(), "two_hours");
    eq("com APP_URL, link no fim", t2.includes("Para mais detalhes, acesse sua conta:"), true);
    eq("barra final da URL não duplica", t2.includes("https://app.exemplo.com//"), false);
    eq("o link aponta para a área do servo", t2.includes("https://app.exemplo.com/servant"), true);
  }

  console.log("\n--- versículos ---");
  {
    const book = new VerseBook();
    eq("o acervo tem versículos", book.size, DEFAULT_VERSES.length);
    eq("nenhum texto vazio", DEFAULT_VERSES.every((v) => v.text.trim().length > 20), true);
    eq("nenhuma referência vazia", DEFAULT_VERSES.every((v) => /\d/.test(v.reference)), true);
    eq("nenhuma referência repetida", new Set(DEFAULT_VERSES.map((v) => v.reference)).size, DEFAULT_VERSES.length);
    eq("acervo vazio é recusado", (() => { try { new VerseBook([]); return false; } catch { return true; } })(), true);

    // Mesma mensagem, mesmo versículo — é o que evita um reenvio parecer
    // dois avisos distintos.
    eq("estável para a mesma semente", book.pick("1:1:day_before").reference, book.pick("1:1:day_before").reference);

    // Espalhamento: um hash quebrado devolveria sempre o mesmo item, e o
    // acervo inteiro viraria enfeite sem ninguém notar.
    const vistos = new Set<string>();
    for (let d = 1; d <= 40; d++) for (let sv = 1; sv <= 10; sv++) {
      vistos.add(book.pick(`${d}:${sv}:day_before`).reference);
    }
    eq("400 mensagens cobrem o acervo todo", vistos.size, book.size);

    const msgClock = new ServiceClock(TZ);
    const { ReminderMessage: RM } = await import("../reminders/ReminderMessage.js");
    const rm = new RM(msgClock, book);
    const texto = rm.build(servo(), "day_before");
    eq("a mensagem termina com versículo e referência",
      /_".+"_\n— \*.+\*/.test(texto), true);
    // Compara a LINHA do versículo, não a mensagem inteira: as duas já diferem
    // por "amanhã"/"hoje", então comparar tudo passava mesmo com o versículo
    // repetido — foi assim que a repetição escapou na primeira versão.
    const linhaVersiculo = (t: string) => t.split("\n").find((l) => l.startsWith("— *"));
    eq("véspera e 2h nunca repetem o versículo",
      [...Array(60).keys()].every((i) => {
        const r = servo({ servantId: i + 1 });
        return linhaVersiculo(rm.build(r, "day_before")) !== linhaVersiculo(rm.build(r, "two_hours"));
      }), true);
  }

  console.log("\n--- rotas de controle ---");
  await checkRotas();

  console.log(`\n${falhas === 0 ? "✅ tudo passou" : `❌ ${falhas} falha(s)`}`);
  process.exit(falhas === 0 ? 0 : 1);
}

/**
 * Sobe o ControlServer com uma sessão falsa e bate nas rotas de verdade.
 *
 * Existe porque a primeira versão do `/qr` servia um PNG estático de um código
 * que o Baileys rotaciona a cada poucos segundos — quem abria a página quase
 * sempre apontava o celular para um QR vencido, e o log só dizia "QR refs
 * attempts ended". Nenhum teste pegava isso, porque não havia teste de rota.
 */
async function checkRotas() {
  const store = { async countByStatus() { return { sent: 3, skipped: 1 }; } } as unknown as ReminderStore;
  let estado = "awaiting_qr";
  let qr: string | null = "2@abcDEF/ghi+jkl,mno=";
  const session = {
    get qr() { return qr; },
    status: () => ({ state: estado, lastConnectedAt: null, lastDisconnectReason: null, hasQr: qr !== null }),
  } as unknown as WhatsAppSession;

  const PORT = 3199;
  new ControlServer(session, store, PORT, () => {}).listen();
  await new Promise((r) => setTimeout(r, 300));
  const base = `http://localhost:${PORT}`;

  const html = await (await fetch(`${base}/qr`)).text();
  eq("/qr se atualiza sozinha", html.includes("setInterval") && html.includes("/qr.png?t="), true);
  eq("/qr diz onde parear no celular", html.includes("Aparelhos conectados"), true);

  const png = await fetch(`${base}/qr.png`);
  eq("/qr.png é imagem sem cache", `${png.headers.get("content-type")}|${png.headers.get("cache-control")}`, "image/png|no-store");
  eq("/qr.png tem bytes de verdade", (await png.arrayBuffer()).byteLength > 100, true);

  qr = null;
  estado = "connected";
  eq("/qr.png sem QR devolve 409", (await fetch(`${base}/qr.png`)).status, 409);
  eq("/health é 200 conectado", (await fetch(`${base}/health`)).status, 200);
  const saude = await (await fetch(`${base}/health`)).json() as { notificationLog: unknown };
  eq("/health traz o contador", saude.notificationLog, { sent: 3, skipped: 1 });

  estado = "disconnected";
  eq("/health é 503 com a sessão caída", (await fetch(`${base}/health`)).status, 503);
}

main().catch((e) => {
  console.error("erro:", e);
  process.exit(1);
});
