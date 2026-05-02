import { db } from "./index";
import { users, ministries, sectors, servants, schedules, scheduleDates, scheduleAvailability, scheduleAssignments } from "./schema";
import { hash } from "bcryptjs";
import "dotenv/config";

async function reset() {
  console.log("⏳ Iniciando reset do banco de dados...");

  try {
    // 1. Limpar dados (ordem reversa das FKs)
    await db.delete(scheduleAssignments);
    await db.delete(scheduleAvailability);
    await db.delete(scheduleDates);
    await db.delete(schedules);
    await db.delete(servants);
    await db.delete(sectors);
    await db.delete(ministries);
    await db.delete(users);

    console.log("✅ Banco de dados limpo com sucesso.");

    // 2. Criar Admin Padrão com senha criptografada
    const adminPassword = await hash("admin123", 10);
    await db.insert(users).values({
      name: "Administrador",
      email: "admin@admin.com",
      password: adminPassword,
      role: "admin",
    });

    console.log("👑 Admin padrão criado: admin@admin.com / admin123");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar banco:", error);
    process.exit(1);
  }
}

reset();
