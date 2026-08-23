import { pgTable, serial, text, timestamp, integer, uuid, date, time, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Topo da hierarquia: igreja → ministérios → setores → servos.
 *
 * `churchId` existe SÓ aqui embaixo, em `users` e `ministries`. As demais
 * tabelas descobrem a igreja por join (setor → ministério, escala →
 * ministério, vínculo → setor). Duplicar a coluna nelas criaria fontes de
 * verdade que podem divergir num update malfeito — ver specs/03.
 */
export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // O "username da igreja": o servo digita isto no login antes do próprio
  // usuário. É o que torna `maria` única sem precisar virar `maria47` —
  // a igreja é o namespace. Único globalmente, e estável: não muda quando
  // o nome de exibição muda.
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  username: text("username"),
  // Global de propósito: é o identificador de admin/líder e, sendo e-mail
  // real, já é único por natureza. Só o `username` é escopado por igreja.
  email: text("email").unique(),
  password: text("password").notNull(),
  // E.164 sem o `+`: código do país colado no número (`5511987654321`).
  // Opcional para todos os papéis. Sem índice único — marido e esposa podem
  // informar o mesmo número, e telefone fixo de família é normal numa igreja.
  // Ver src/lib/phone.ts para o porquê deste formato.
  phone: text("phone"),
  role: text("role", { enum: ["admin", "leader", "servant"] }).default("servant").notNull(),
  color: text("color"),
  churchId: integer("church_id").references(() => churches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  // Dois servos podem se chamar "davi" em igrejas diferentes. No Postgres
  // NULL nunca é igual a NULL, então isto não atrapalha admin/líder, que
  // têm `username` nulo e se identificam por e-mail.
  uniqueIndex("users_church_username_idx").on(t.churchId, t.username),
]);

export const ministries = pgTable("ministries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaderId: uuid("leader_id").references(() => users.id).notNull(),
  churchId: integer("church_id").references(() => churches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ministryId: integer("ministry_id").references(() => ministries.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const servants = pgTable("servants", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sectorId: integer("sector_id").references(() => sectors.id, { onDelete: "cascade" }).notNull(),
  isCoordinator: boolean("is_coordinator").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ministryId: integer("ministry_id").references(() => ministries.id, { onDelete: "cascade" }).notNull(),
  sectorId: integer("sector_id").references(() => sectors.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: ["draft", "published"] }).default("draft").notNull(),
  // public: qualquer um com o link responde. private: exige login e vínculo com o setor.
  visibility: text("visibility", { enum: ["public", "private"] }).default("public").notNull(),
  shareLink: text("share_link").notNull().unique(), // nanoid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleDates = pgTable("schedule_dates", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => schedules.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
});

export const scheduleAvailability = pgTable("schedule_availability", {
  id: serial("id").primaryKey(),
  dateId: integer("date_id").references(() => scheduleDates.id, { onDelete: "cascade" }).notNull(),
  servantId: integer("servant_id").references(() => servants.id, { onDelete: "cascade" }).notNull(),
});

export const scheduleAssignments = pgTable("schedule_assignments", {
  id: serial("id").primaryKey(),
  dateId: integer("date_id").references(() => scheduleDates.id, { onDelete: "cascade" }).notNull(),
  servantId: integer("servant_id").references(() => servants.id, { onDelete: "cascade" }).notNull(),
});

export const swapRequests = pgTable("swap_requests", {
  id: serial("id").primaryKey(),
  dateId: integer("date_id").references(() => scheduleDates.id, { onDelete: "cascade" }).notNull(),
  requesterServantId: integer("requester_servant_id").references(() => servants.id, { onDelete: "cascade" }).notNull(),
  targetServantId: integer("target_servant_id").references(() => servants.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

// Relations
export const churchesRelations = relations(churches, ({ many }) => ({
  users: many(users),
  ministries: many(ministries),
}));

export const ministriesRelations = relations(ministries, ({ one, many }) => ({
  sectors: many(sectors),
  leader: one(users, { fields: [ministries.leaderId], references: [users.id] }),
  church: one(churches, { fields: [ministries.churchId], references: [churches.id] }),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  ministry: one(ministries, { fields: [sectors.ministryId], references: [ministries.id] }),
  servants: many(servants),
  schedules: many(schedules),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  servant: one(servants),
  ministriesLed: many(ministries),
  church: one(churches, { fields: [users.churchId], references: [churches.id] }),
}));

export const servantsRelations = relations(servants, ({ one, many }) => ({
  user: one(users, { fields: [servants.userId], references: [users.id] }),
  sector: one(sectors, { fields: [servants.sectorId], references: [sectors.id] }),
  availabilities: many(scheduleAvailability),
  assignments: many(scheduleAssignments),
  requestedSwaps: many(swapRequests, { relationName: "swapRequester" }),
  targetedSwaps: many(swapRequests, { relationName: "swapTarget" }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  ministry: one(ministries, { fields: [schedules.ministryId], references: [ministries.id] }),
  sector: one(sectors, { fields: [schedules.sectorId], references: [sectors.id] }),
  dates: many(scheduleDates),
}));

export const scheduleAvailabilityRelations = relations(scheduleAvailability, ({ one }) => ({
  date: one(scheduleDates, { fields: [scheduleAvailability.dateId], references: [scheduleDates.id] }),
  servant: one(servants, { fields: [scheduleAvailability.servantId], references: [servants.id] }),
}));

export const scheduleAssignmentsRelations = relations(scheduleAssignments, ({ one }) => ({
  date: one(scheduleDates, { fields: [scheduleAssignments.dateId], references: [scheduleDates.id] }),
  servant: one(servants, { fields: [scheduleAssignments.servantId], references: [servants.id] }),
}));

export const swapRequestsRelations = relations(swapRequests, ({ one }) => ({
  date: one(scheduleDates, { fields: [swapRequests.dateId], references: [scheduleDates.id] }),
  requester: one(servants, { fields: [swapRequests.requesterServantId], references: [servants.id], relationName: "swapRequester" }),
  target: one(servants, { fields: [swapRequests.targetServantId], references: [servants.id], relationName: "swapTarget" }),
}));

export const scheduleDatesRelations = relations(scheduleDates, ({ one, many }) => ({
  schedule: one(schedules, { fields: [scheduleDates.scheduleId], references: [schedules.id] }),
  availabilities: many(scheduleAvailability),
  assignments: many(scheduleAssignments),
}));
