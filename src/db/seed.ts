import "dotenv/config";
import { db } from "./index";
import { users, ministries, sectors, servants } from "./schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

const isHashed = (password: string) => password.startsWith("$2");

interface Identifier {
  email?: string;
  username?: string;
}

function identifierLabel(identifier: Identifier) {
  return identifier.username ?? identifier.email!;
}

async function seedUser(name: string, identifier: Identifier, plainPassword: string, role: "admin" | "leader" | "servant") {
  const whereCondition = identifier.username
    ? eq(users.username, identifier.username)
    : eq(users.email, identifier.email!);
  const [existing] = await db.select().from(users).where(whereCondition);

  if (!existing) {
    const hashedPassword = await hash(plainPassword, 10);
    const [created] = await db.insert(users).values({
      name,
      email: identifier.email ?? null,
      username: identifier.username ?? null,
      password: hashedPassword,
      role,
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

  console.log(`ℹ️ User already exists: ${identifierLabel(identifier)}`);
  return existing;
}

async function seedSector(name: string, ministryId: number) {
  let [sector] = await db.select().from(sectors).where(eq(sectors.name, name));
  if (!sector) {
    [sector] = await db.insert(sectors).values({ name, ministryId }).returning();
    console.log(`✅ Sector created: ${name}`);
  }
  return sector;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function seed() {
  console.log("🌱 Seeding database...");

  const admin = await seedUser(
    requireEnv("SEED_ADMIN_NAME"),
    { email: requireEnv("SEED_ADMIN_EMAIL") },
    requireEnv("SEED_ADMIN_PASSWORD"),
    "admin"
  );
  const servantUser = await seedUser(
    requireEnv("SEED_SERVANT_NAME"),
    { username: requireEnv("SEED_SERVANT_USERNAME") },
    requireEnv("SEED_SERVANT_PASSWORD"),
    "servant"
  );

  let [ministry] = await db.select().from(ministries).where(eq(ministries.leaderId, admin.id));
  if (!ministry) {
    [ministry] = await db.insert(ministries).values({
      name: "Multimídia",
      description: null,
      leaderId: admin.id,
    }).returning();
    console.log("✅ Ministry created: Multimídia");
  }

  const transmissao = await seedSector("Transmissão", ministry.id);
  await seedSector("Fotografia", ministry.id);

  const [existingServant] = await db.select().from(servants).where(eq(servants.userId, servantUser.id));
  if (!existingServant) {
    await db.insert(servants).values({
      userId: servantUser.id,
      sectorId: transmissao.id,
    });
    console.log("✅ Servant linked to sector: Transmissão");
  }

  console.log("✨ Seeding finished.");
  console.log(`   ${admin.email} — Admin`);
  console.log(`   usuário: ${servantUser.username} — Servo (Transmissão)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
