/**
 * Aplica um arquivo SQL de `drizzle/manual/` no banco de `DATABASE_URL`.
 *
 *   npx tsx src/db/apply-migration.ts drizzle/manual/001_multi_igreja.sql
 *
 * Existe porque os SQL desta pasta são escritos à mão (ver o cabeçalho do
 * 001 para o porquê) e o `psql` não está instalado nesta máquina. Manda o
 * arquivo inteiro numa query só: o protocolo simples do node-postgres aceita
 * múltiplos comandos, inclusive os blocos `DO $$ ... $$`, e o `BEGIN/COMMIT`
 * de dentro do arquivo continua valendo — ou tudo entra, ou nada entra.
 *
 * Imprime as contagens antes e depois. Uma migração que mexe em tabela com
 * dado precisa provar que não perdeu linha, não só que não deu erro.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const TABLES = ["users", "ministries", "sectors", "servants", "schedules"];

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const { rows } = await db.execute(sql.raw(`select count(*)::int n from "${t}"`));
    out[t] = Number((rows[0] as Record<string, unknown>).n);
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("uso: npx tsx src/db/apply-migration.ts <arquivo.sql>");

  const url = process.env.DATABASE_URL ?? "";
  console.log("alvo:", url.replace(/:\/\/[^@]*@/, "://***@").replace(/@[^/]*\//, "@***/"));
  console.log("arquivo:", file, "\n");

  const before = await counts();
  console.log("contagens ANTES:", before);

  const statements = readFileSync(file, "utf-8");
  await db.execute(sql.raw(statements));
  console.log("\nSQL aplicado sem erro.");

  const after = await counts();
  console.log("contagens DEPOIS:", after);

  const perdidas = TABLES.filter((t) => after[t] !== before[t]);
  if (perdidas.length > 0) {
    throw new Error(`CONTAGEM MUDOU em: ${perdidas.join(", ")} — investigar antes de seguir.`);
  }
  console.log("✅ nenhuma linha perdida.");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ ERRO:", e.message);
  console.error("O arquivo roda dentro de BEGIN/COMMIT — se abortou, nada foi gravado.");
  process.exit(1);
});
