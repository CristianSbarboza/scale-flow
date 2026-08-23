import "dotenv/config";
import { db } from "./index";
import { churches, users } from "./schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

/**
 * Provisiona uma igreja nova e o primeiro admin dela.
 *
 * Este é o ÚNICO caminho para uma igreja nascer. Não existe tela, e é de
 * propósito: um papel capaz de criar igrejas seria também um papel capaz de
 * enxergar todas elas — o único caminho no sistema que poderia vazar dados de
 * uma igreja para outra. Não construir esse papel elimina a classe de falha
 * inteira. Ver RNF03 em specs/03-spec-multi-igreja/spec.md.
 *
 * Uso:
 *   CHURCH_NAME="Igreja Batista Central" \
 *   CHURCH_USERNAME="batista-central" \
 *   CHURCH_ADMIN_NAME="Maria Souza" \
 *   CHURCH_ADMIN_EMAIL="maria@igreja.com" \
 *   CHURCH_ADMIN_PASSWORD="uma-senha-forte" \
 *   npx tsx src/db/create-church.ts
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * O username da igreja é digitado no login e entra em URL de convite.
 * Sem espaço, acento ou maiúscula — quem digita errado não entra.
 */
function assertValidUsername(username: string) {
  if (!/^[a-z0-9-]+$/.test(username)) {
    throw new Error(
      `CHURCH_USERNAME inválido: "${username}". Use apenas letras minúsculas, números e hífen.`
    );
  }
}

async function main() {
  const name = requireEnv("CHURCH_NAME");
  const username = requireEnv("CHURCH_USERNAME").trim().toLowerCase();
  const adminName = requireEnv("CHURCH_ADMIN_NAME");
  const adminEmail = requireEnv("CHURCH_ADMIN_EMAIL").trim().toLowerCase();
  const adminPassword = requireEnv("CHURCH_ADMIN_PASSWORD");

  assertValidUsername(username);

  if (adminPassword.length < 8) {
    throw new Error("CHURCH_ADMIN_PASSWORD precisa ter ao menos 8 caracteres.");
  }

  const [taken] = await db.select().from(churches).where(eq(churches.username, username));
  if (taken) {
    throw new Error(`Já existe uma igreja com o username "${username}" (${taken.name}).`);
  }

  // E-mail é único globalmente (RNF04): se já existe, pertence a outra igreja
  // e não pode ser reaproveitado — seria sequestrar a conta de alguém.
  const [emailTaken] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (emailTaken) {
    throw new Error(
      `O e-mail ${adminEmail} já pertence a um usuário de outra igreja. ` +
      `Cada pessoa só existe em uma igreja — use outro e-mail.`
    );
  }

  const [church] = await db.insert(churches).values({ name, username }).returning();

  const [admin] = await db.insert(users).values({
    name: adminName,
    email: adminEmail,
    username: null,
    password: await hash(adminPassword, 10),
    role: "admin",
    churchId: church.id,
  }).returning();

  console.log(`✅ Igreja criada: ${church.name} (username: ${church.username}, id: ${church.id})`);
  console.log(`✅ Admin criado: ${admin.email}`);
  console.log(`\nO admin entra em /login pela aba "Líder / Admin", só com e-mail e senha.`);
  console.log(`Os servos desta igreja entram informando a igreja "${church.username}".`);
  console.log(`Link que já preenche o campo: /login?igreja=${church.username}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Falhou:", err.message);
  process.exit(1);
});
