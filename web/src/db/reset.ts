import "dotenv/config";
import { db } from "./index";
import { users, ministries, sectors, servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "./schema";

async function reset() {
  console.log("⏳ Iniciando reset do banco de dados...");

  try {
    // Limpar dados (ordem reversa das FKs)
    await db.delete(scheduleAssignments);
    await db.delete(scheduleAvailability);
    await db.delete(scheduleDates);
    await db.delete(schedules);
    await db.delete(servants);
    await db.delete(sectors);
    await db.delete(ministries);
    await db.delete(users);

    console.log("✅ Banco de dados limpo com sucesso.");
    console.log("ℹ️ Rode 'npx tsx src/db/seed.ts' para recriar as contas de teste.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar banco:", error);
    process.exit(1);
  }
}

reset();
