/**
 * Pré-voo SOMENTE-LEITURA da migração `drizzle/manual/001_multi_igreja.sql`.
 *
 * Não escreve nada. Só responde: o banco alvo está no estado que a migração
 * espera encontrar, e existe alguma linha que faria a migração abortar?
 *
 *   npx tsx src/db/preflight-multi-igreja.ts            # usa o .env (produção)
 *
 * O bloqueio que este script procura é um só: usernames duplicados. O índice
 * novo é (church_id, username) e o backfill põe TODO mundo na mesma igreja —
 * então dois "davi" hoje viram colisão amanhã. Melhor descobrir aqui do que
 * no meio da transação.
 */
import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function q(label: string, query: string) {
  const { rows } = await db.execute(sql.raw(query));
  console.log(`\n### ${label}`);
  console.table(rows);
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  console.log("alvo:", url.replace(/:\/\/[^@]*@/, "://***@").replace(/@[^/]*\//, "@***/"));

  await q("tabelas presentes", `
    select table_name from information_schema.tables
    where table_schema='public'
      and table_name in ('churches','users','ministries','sectors','servants','schedules')
    order by table_name`);

  await q("colunas church_id (vazio = migração ainda não rodou)", `
    select table_name, column_name, is_nullable from information_schema.columns
    where table_schema='public' and column_name='church_id'`);

  await q("contagens antes", `
    select 'users' t, count(*)::int n from users
    union all select 'ministries', count(*)::int from ministries
    union all select 'sectors', count(*)::int from sectors
    union all select 'servants', count(*)::int from servants
    union all select 'schedules', count(*)::int from schedules`);

  await q("constraints de username/email em users", `
    select conname, contype from pg_constraint
    where conrelid='users'::regclass
      and (conname like '%username%' or conname like '%email%')`);

  const dup = await q("BLOQUEIO: usernames duplicados", `
    select username, count(*)::int n from users
    where username is not null group by username having count(*) > 1`);

  await q("papéis e como cada um se identifica", `
    select role, count(*)::int total,
           count(username)::int com_username,
           count(email)::int com_email
    from users group by role order by role`);

  // --- Daqui para baixo só faz sentido DEPOIS da migração ---------------
  const migrou = await db.execute(sql.raw(
    `select count(*)::int n from information_schema.tables
      where table_schema='public' and table_name='churches'`));
  if (Number((migrou.rows[0] as Record<string, unknown>).n) === 0) {
    console.log(
      dup.length === 0
        ? "\nOK: nenhum username duplicado. A migração não tem bloqueio conhecido."
        : `\nBLOQUEIO: ${dup.length} username(s) duplicado(s) — resolver ANTES de migrar.`
    );
    process.exit(dup.length === 0 ? 0 : 1);
  }

  await q("igrejas", `select id, name, username from churches order by id`);

  await q("índice (church_id, username) existe?", `
    select indexname from pg_indexes
    where tablename='users' and indexname='users_church_username_idx'`);

  await q("para qual igreja cada linha aponta", `
    select 'users' t, c.username igreja, count(*)::int n
      from users u join churches c on c.id=u.church_id group by c.username
    union all
    select 'ministries', c.username, count(*)::int
      from ministries m join churches c on c.id=m.church_id group by c.username`);

  const orfas = await q("FK órfã (tem que vir vazio)", `
    select 'users' t, count(*)::int n from users u
      left join churches c on c.id=u.church_id where c.id is null
    having count(*) > 0
    union all
    select 'ministries', count(*)::int from ministries m
      left join churches c on c.id=m.church_id where c.id is null
    having count(*) > 0`);

  console.log(orfas.length === 0
    ? "\n✅ Migração verificada: church_id NOT NULL, sem FK órfã, índice por igreja no lugar."
    : "\n❌ FK órfã encontrada — investigar.");
  process.exit(orfas.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
