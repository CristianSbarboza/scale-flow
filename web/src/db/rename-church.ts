import "dotenv/config";
import { db } from "./index";
import { churches, users } from "./schema";
import { and, eq, ne } from "drizzle-orm";

/**
 * Renomeia uma igreja: nome de exibição, username de login, ou os dois.
 *
 * O nome de exibição também é editável pela tela (`/admin/settings`, só admin).
 * O **username não é**, e este script é o único caminho — porque ele é o que os
 * servos digitam para entrar. Trocá-lo derruba o acesso de todo mundo da igreja
 * de uma vez, sem aviso: é uma operação de manutenção, feita por quem sabe o
 * que está fazendo e vai avisar as pessoas depois. Ver RNF04 e a nota de
 * `renameChurch` em src/lib/actions/church.ts.
 *
 * Uso (ao menos um dos dois campos novos é obrigatório):
 *   CHURCH_USERNAME="padrao" \
 *   CHURCH_NEW_NAME="Igreja Somos Um" \
 *   CHURCH_NEW_USERNAME="igrejasomosum" \
 *   npx tsx src/db/rename-church.ts
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Mesma regra de `create-church.ts`: vai em URL e é digitado à mão. */
function assertValidUsername(username: string) {
  if (!/^[a-z0-9-]+$/.test(username)) {
    throw new Error(
      `CHURCH_NEW_USERNAME inválido: "${username}". Use apenas letras minúsculas, números e hífen.`
    );
  }
}

async function main() {
  const current = requireEnv("CHURCH_USERNAME").trim().toLowerCase();
  const newName = process.env.CHURCH_NEW_NAME?.trim() || null;
  const newUsername = process.env.CHURCH_NEW_USERNAME?.trim().toLowerCase() || null;

  if (!newName && !newUsername) {
    throw new Error("Nada a fazer: informe CHURCH_NEW_NAME e/ou CHURCH_NEW_USERNAME.");
  }

  const url = process.env.DATABASE_URL ?? "";
  console.log("alvo:", url.replace(/:\/\/[^@]*@/, "://***@").replace(/@[^/]*\//, "@***/"));

  const [church] = await db.select().from(churches).where(eq(churches.username, current));
  if (!church) throw new Error(`Nenhuma igreja com o username "${current}".`);

  if (newUsername && newUsername !== current) {
    assertValidUsername(newUsername);
    const [taken] = await db.select().from(churches)
      .where(and(eq(churches.username, newUsername), ne(churches.id, church.id)));
    if (taken) throw new Error(`O username "${newUsername}" já é de outra igreja (${taken.name}).`);
  }

  console.log(`\nigreja #${church.id}`);
  console.log(`  name:     "${church.name}"${newName ? `  ->  "${newName}"` : "   (sem mudança)"}`);
  console.log(`  username: "${church.username}"${newUsername ? `  ->  "${newUsername}"` : "   (sem mudança)"}`);

  await db.update(churches)
    .set({
      ...(newName ? { name: newName } : {}),
      ...(newUsername ? { username: newUsername } : {}),
    })
    .where(eq(churches.id, church.id));

  const [after] = await db.select().from(churches).where(eq(churches.id, church.id));
  console.log(`\n✅ gravado: "${after.name}" / "${after.username}"`);

  // Quem precisa ser avisado. Admin e líder entram por e-mail e não sentem
  // a troca; só quem tem username digita a igreja no login.
  const afetados = await db.select({ username: users.username })
    .from(users)
    .where(and(eq(users.churchId, church.id), ne(users.role, "admin")));
  const comUsername = afetados.filter((u) => u.username);

  if (newUsername && newUsername !== current && comUsername.length > 0) {
    console.log(`\n⚠️  ${comUsername.length} pessoa(s) entram por usuário e precisam do link novo:`);
    console.log(`   /login?igreja=${after.username}`);
    console.log(`   O link antigo (?igreja=${current}) parou de funcionar agora.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("❌ ERRO:", e.message);
  process.exit(1);
});
