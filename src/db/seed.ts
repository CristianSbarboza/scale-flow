import "dotenv/config";
import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@scaleflow.com"));

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      name: "Administrador",
      email: "admin@scaleflow.com",
      password: "admin123", // Em um sistema real, use hash (bcrypt)
      role: "admin",
    });
    console.log("✅ Admin user created: admin@scaleflow.com / admin123");
  } else {
    console.log("ℹ️ Admin user already exists.");
  }

  console.log("✨ Seeding finished.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
