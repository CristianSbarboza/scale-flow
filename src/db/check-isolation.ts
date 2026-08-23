/**
 * Verifica o isolamento entre igrejas: login e invariantes do banco.
 *
 * Exercita o `authorize()` real de `src/lib/auth.ts`, em vez de reimplementar
 * a lógica — um teste que copia a regra que quer verificar não verifica nada.
 *
 * Depende do fixture de duas igrejas criado por `src/db/seed.ts`, então roda
 * só em banco local:
 *
 *   DATABASE_URL="postgresql://postgres:password@localhost:5432/scaleflow" \
 *     npx tsx src/db/check-isolation.ts
 *
 * Sai com código 1 se qualquer caso falhar, para poder entrar em CI depois.
 *
 * NÃO cobre o isolamento de LEITURA das server actions (critérios 2 e 3 da
 * spec). Elas chamam `getServerSession()`, que exige contexto de requisição e
 * não existe num script — essa parte continua sendo verificação manual no
 * navegador, com dois logins. Ver validation.md.
 */
import "dotenv/config";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const provider = authOptions.providers[0] as any;
// No next-auth v4 o `authorize` de topo é um stub que devolve null; o real
// mora em `options.authorize`. Pegar o de topo faz todo teste "passar" por
// recusar tudo.
const authorize = provider.options?.authorize ?? provider.authorize;

async function tryLogin(label: string, creds: Record<string, string>, esperado: "entra" | "recusa") {
  const user = await authorize(creds, {} as never);
  const obtido = user ? "entra" : "recusa";
  const ok = obtido === esperado ? "✅" : "❌";
  const extra = user ? ` (churchId=${user.churchId}, role=${user.role}, name=${user.name})` : "";
  console.log(`${ok} ${label}: esperado ${esperado}, obtido ${obtido}${extra}`);
  return obtido === esperado;
}

async function check(label: string, query: string, esperado: number) {
  const { rows } = await db.execute(sql.raw(query));
  const obtido = Number((rows[0] as Record<string, unknown>).n);
  const ok = obtido === esperado;
  console.log(`${ok ? "✅" : "❌"} ${label}: esperado ${esperado}, obtido ${obtido}`);
  return ok;
}

/**
 * Invariantes que o banco precisa sustentar sozinho, sem depender de nenhuma
 * linha de TypeScript ter sido escrita direito.
 */
async function checkDatabaseInvariants(): Promise<boolean[]> {
  const r: boolean[] = [];

  r.push(await check("nenhum usuário sem igreja",
    "select count(*)::int n from users where church_id is null", 0));
  r.push(await check("nenhum ministério sem igreja",
    "select count(*)::int n from ministries where church_id is null", 0));
  r.push(await check("nenhuma FK de igreja órfã (users)",
    "select count(*)::int n from users u left join churches c on c.id=u.church_id where c.id is null", 0));
  r.push(await check("nenhuma FK de igreja órfã (ministries)",
    "select count(*)::int n from ministries m left join churches c on c.id=m.church_id where c.id is null", 0));

  r.push(await check("constraint global de username foi removida",
    "select count(*)::int n from pg_constraint where conrelid='users'::regclass and conname='users_username_unique'", 0));
  r.push(await check("índice (church_id, username) existe",
    "select count(*)::int n from pg_indexes where tablename='users' and indexname='users_church_username_idx'", 1));
  r.push(await check("e-mail continua único globalmente",
    "select count(*)::int n from pg_constraint where conrelid='users'::regclass and conname='users_email_unique'", 1));

  // O fixture precisa ter duas igrejas com dados distintos, senão os testes
  // manuais de isolamento não provam nada — é a armadilha central desta spec.
  r.push(await check("o fixture tem pelo menos duas igrejas",
    "select count(*)::int n from churches", 2));
  r.push(await check("o fixture tem servo com e-mail (senão o login por e-mail não é testado)",
    "select count(*)::int n from users where role='servant' and email is not null", 1));

  r.push(await check("o mesmo username existe em duas igrejas",
    `select count(*)::int n from (
       select username from users where username is not null
       group by username having count(distinct church_id) > 1
     ) t`, 1));

  // Um vínculo de servo é a única junção entre duas raízes (user e sector) e o
  // banco não impede que venham de igrejas diferentes. Se este falhar, algum
  // caminho de escrita está sem a checagem de igreja.
  r.push(await check("nenhum vínculo de servo cruzando igrejas",
    `select count(*)::int n
       from servants sv
       join users u   on u.id = sv.user_id
       join sectors s on s.id = sv.sector_id
       join ministries m on m.id = s.ministry_id
      where u.church_id <> m.church_id`, 0));

  // Idem para escalas: ministério e setor precisam ser da mesma igreja.
  r.push(await check("nenhuma escala cruzando igrejas",
    `select count(*)::int n
       from schedules sc
       join ministries m on m.id = sc.ministry_id
       join sectors s    on s.id = sc.sector_id
       join ministries m2 on m2.id = s.ministry_id
      where m.church_id <> m2.church_id`, 0));

  return r;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main() {
  console.log("alvo:", (process.env.DATABASE_URL ?? "").replace(/:\/\/[^@]*@/, "://***@"), "\n");

  if ((process.env.DATABASE_URL ?? "").includes("neon.tech")) {
    throw new Error("Recusando rodar contra banco remoto — este script depende do fixture local.");
  }

  // Credenciais da igreja A vêm do ambiente, como no seed: são as senhas reais
  // do operador e não podem ficar escritas no repositório. As da igreja B são
  // fixture de mentira, criadas pelo próprio seed.
  const userA = requireEnv("SEED_SERVANT_USERNAME");
  const passA = requireEnv("SEED_SERVANT_PASSWORD");
  const passB = "servo-b-123";
  const adminB = "admin.b@teste.local";

  const r: boolean[] = [];

  // O caso que motivou o desenho: mesmo username, igrejas diferentes, senhas
  // diferentes. Cada um entra na sua e em nenhuma outra.
  r.push(await tryLogin("servo padrao + igreja padrao",
    { church: "padrao", username: userA, password: passA }, "entra"));
  r.push(await tryLogin("servo teste-b + igreja teste-b",
    { church: "teste-b", username: userA, password: passB }, "entra"));

  console.log("");
  r.push(await tryLogin("senha da igreja A na igreja B  (cruzamento)",
    { church: "teste-b", username: userA, password: passA }, "recusa"));
  r.push(await tryLogin("senha da igreja B na igreja A  (cruzamento)",
    { church: "padrao", username: userA, password: passB }, "recusa"));

  console.log("");
  r.push(await tryLogin("servo sem informar a igreja",
    { username: userA, password: passA }, "recusa"));
  r.push(await tryLogin("igreja inexistente",
    { church: "nao-existe", username: userA, password: passA }, "recusa"));
  r.push(await tryLogin("igreja com espaco e maiuscula (normalizacao)",
    { church: "  PADRAO  ", username: userA, password: passA }, "entra"));

  console.log("");
  r.push(await tryLogin("admin por email, sem igreja",
    { email: adminB, password: "admin-b-123" }, "entra"));
  r.push(await tryLogin("admin com senha errada",
    { email: adminB, password: "errada" }, "recusa"));

  console.log("");
  // Servo TAMBÉM entra por e-mail, sem informar igreja: o e-mail é único no
  // mundo, então já identifica a igreja sozinho. O que precisa ser verificado
  // não é só o "entra" — é o churchId vir certo, senão a pessoa entra e cai no
  // escopo errado, que é pior do que não entrar.
  const servoEmailB = "servo.b@teste.local";
  r.push(await tryLogin("servo por e-mail, sem igreja",
    { email: servoEmailB, password: passB }, "entra"));
  r.push(await tryLogin("servo por e-mail com senha errada",
    { email: servoEmailB, password: "errada" }, "recusa"));

  const viaEmail = await authorize({ email: servoEmailB, password: passB }, {} as never);
  const [igrejaB] = (await db.execute(sql.raw(
    "select id from churches where username='teste-b'"))).rows as Array<{ id: number }>;
  const churchOk = !!viaEmail && Number(viaEmail.churchId) === Number(igrejaB?.id);
  console.log(`${churchOk ? "✅" : "❌"} churchId do servo pelo e-mail: ${viaEmail?.churchId} (esperado ${igrejaB?.id})`);
  r.push(churchOk);

  console.log("\n--- invariantes do banco ---");
  r.push(...(await checkDatabaseInvariants()));

  const falhas = r.filter((x) => !x).length;
  console.log(`\n${falhas === 0 ? "✅ todos passaram" : `❌ ${falhas} falha(s)`} — ${r.length} casos`);
  console.log("ℹ️  Isolamento de leitura das actions (critérios 2 e 3) exige verificação manual — ver validation.md.");
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("erro:", e);
  process.exit(1);
});
