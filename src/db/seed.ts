import "dotenv/config";
import { db } from "./index";
import { users, ministries, sectors, servants, churches } from "./schema";
import { and, eq } from "drizzle-orm";
import { hash } from "bcryptjs";

const isHashed = (password: string) => password.startsWith("$2");

interface Identifier {
  email?: string;
  username?: string;
  /** E.164 sem `+`. Opcional — o fixture precisa ter gente sem telefone. */
  phone?: string;
}

function identifierLabel(identifier: Identifier) {
  return identifier.username ?? identifier.email!;
}

async function seedChurch(name: string, username: string) {
  const [existing] = await db.select().from(churches).where(eq(churches.username, username));
  if (existing) {
    console.log(`ℹ️ Church already exists: ${username}`);
    return existing;
  }
  const [created] = await db.insert(churches).values({ name, username }).returning();
  console.log(`✅ Church created: ${name} (${username})`);
  return created;
}

async function seedUser(
  name: string,
  identifier: Identifier,
  plainPassword: string,
  role: "admin" | "leader" | "servant",
  churchId: number
) {
  // E-mail é único globalmente; username só dentro da igreja. A busca precisa
  // seguir a mesma regra, senão o seed da segunda igreja acha o "davi" da
  // primeira e não cria nada.
  const whereCondition = identifier.username
    ? and(eq(users.username, identifier.username), eq(users.churchId, churchId))
    : eq(users.email, identifier.email!);
  const [existing] = await db.select().from(users).where(whereCondition);

  if (!existing) {
    const hashedPassword = await hash(plainPassword, 10);
    const [created] = await db.insert(users).values({
      name,
      email: identifier.email ?? null,
      username: identifier.username ?? null,
      phone: identifier.phone ?? null,
      password: hashedPassword,
      role,
      churchId,
    }).returning();
    console.log(`✅ User created: ${identifierLabel(identifier)} / ${plainPassword}`);
    return created;
  }

  if (!isHashed(existing.password)) {
    const hashedPassword = await hash(plainPassword, 10);
    const [fixed] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, existing.id)).returning();
    console.log(`🔧 Fixed plaintext password for: ${identifierLabel(identifier)}`);
    return fixed;
  }

  // Completa o e-mail se ele entrou no seed depois que a linha já existia.
  // Sem isto, quem semeou antes nunca ganha o servo-com-e-mail e o caminho de
  // login por e-mail continua sem cobertura, sem ninguém notar.
  const faltando: Partial<{ email: string; phone: string }> = {};
  if (identifier.email && !existing.email) faltando.email = identifier.email;
  if (identifier.phone && !existing.phone) faltando.phone = identifier.phone;
  if (Object.keys(faltando).length > 0) {
    const [fixed] = await db.update(users)
      .set(faltando)
      .where(eq(users.id, existing.id)).returning();
    console.log(`🔧 Backfilled ${Object.keys(faltando).join(", ")} for: ${identifierLabel(identifier)}`);
    return fixed;
  }

  console.log(`ℹ️ User already exists: ${identifierLabel(identifier)}`);
  return existing;
}

async function seedSector(name: string, ministryId: number) {
  // Escopado pelo ministério: "Transmissão" pode existir nas duas igrejas.
  let [sector] = await db.select().from(sectors)
    .where(and(eq(sectors.name, name), eq(sectors.ministryId, ministryId)));
  if (!sector) {
    [sector] = await db.insert(sectors).values({ name, ministryId }).returning();
    console.log(`✅ Sector created: ${name}`);
  }
  return sector;
}

async function seedMinistry(name: string, leaderId: string, churchId: number) {
  let [ministry] = await db.select().from(ministries)
    .where(and(eq(ministries.name, name), eq(ministries.churchId, churchId)));
  if (!ministry) {
    [ministry] = await db.insert(ministries).values({
      name,
      description: null,
      leaderId,
      churchId,
    }).returning();
    console.log(`✅ Ministry created: ${name}`);
  }
  return ministry;
}

async function linkServant(userId: string, sectorId: number) {
  const [existing] = await db.select().from(servants)
    .where(and(eq(servants.userId, userId), eq(servants.sectorId, sectorId)));
  if (!existing) {
    await db.insert(servants).values({ userId, sectorId });
    console.log(`✅ Servant linked to sector ${sectorId}`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Segunda igreja, só em ambiente local.
 *
 * Não é enfeite: multi-tenancy validado com uma igreja só no banco não prova
 * nada — sem um vizinho para NÃO enxergar, todo filtro passa no teste. O servo
 * daqui usa de propósito o MESMO username do servo da primeira igreja, que é o
 * caso que o índice único por igreja precisa aceitar.
 */
async function seedSecondChurch(firstServantUsername: string) {
  const church = await seedChurch("Igreja Teste B", "teste-b");

  const admin = await seedUser(
    "Admin Igreja B",
    { email: "admin.b@teste.local", phone: "5511999990001" },
    "admin-b-123",
    "admin",
    church.id
  );
  // Com e-mail de propósito: servo pode ter e-mail e entrar por ele, sem
  // informar igreja. É o único servo do fixture nessa condição, e é o que dá
  // ao harness um caso para exercitar esse caminho.
  const servant = await seedUser(
    "Servo Igreja B",
    { username: firstServantUsername, email: "servo.b@teste.local", phone: "5511999990002" },
    "servo-b-123",
    "servant",
    church.id
  );

  const ministry = await seedMinistry("Louvor B", admin.id, church.id);
  const sector = await seedSector("Voz B", ministry.id);
  await linkServant(servant.id, sector.id);

  console.log(`   igreja: teste-b | admin.b@teste.local / admin-b-123 — Admin`);
  console.log(`   igreja: teste-b | usuário: ${firstServantUsername} / servo-b-123 — Servo`);
  console.log(`   (o mesmo servo também entra por servo.b@teste.local, sem igreja)`);
  // A igreja A fica SEM telefone de propósito: é o caminho nulo, e sem alguém
  // nessa condição no fixture ninguém descobre que a tela quebra com ele.
}

async function seed() {
  // `.env` aponta para o Neon de produção. Quem roda o seed precisa ver o
  // alvo antes de a primeira linha ser escrita, não depois.
  const target = (process.env.DATABASE_URL ?? "").replace(/:\/\/[^@]*@/, "://***@");
  console.log(`🌱 Seeding database...\n   alvo: ${target}\n`);

  const church = await seedChurch("Igreja Padrão", "padrao");

  const admin = await seedUser(
    requireEnv("SEED_ADMIN_NAME"),
    { email: requireEnv("SEED_ADMIN_EMAIL") },
    requireEnv("SEED_ADMIN_PASSWORD"),
    "admin",
    church.id
  );
  const servantUsername = requireEnv("SEED_SERVANT_USERNAME");
  const servantUser = await seedUser(
    requireEnv("SEED_SERVANT_NAME"),
    { username: servantUsername },
    requireEnv("SEED_SERVANT_PASSWORD"),
    "servant",
    church.id
  );

  const ministry = await seedMinistry("Multimídia", admin.id, church.id);
  const transmissao = await seedSector("Transmissão", ministry.id);
  await seedSector("Fotografia", ministry.id);
  await linkServant(servantUser.id, transmissao.id);

  console.log("✨ Seeding finished.");
  console.log(`   ${admin.email} — Admin`);
  console.log(`   usuário: ${servantUser.username} — Servo (Transmissão)`);

  // Credenciais fixas: fixture de desenvolvimento, nunca em banco de verdade.
  const isRemote = (process.env.DATABASE_URL ?? "").includes("neon.tech");
  if (isRemote) {
    console.log("\n⏭️  Banco remoto detectado — segunda igreja NÃO semeada.");
  } else {
    console.log("\n🌱 Seeding second church (fixture local de isolamento)...");
    await seedSecondChurch(servantUsername);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
