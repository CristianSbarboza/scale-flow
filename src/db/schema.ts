import { pgTable, serial, text, timestamp, integer, uuid, date, time } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "leader", "servant"] }).default("servant").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ministries = pgTable("ministries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaderId: uuid("leader_id").references(() => users.id).notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ministryId: integer("ministry_id").references(() => ministries.id, { onDelete: "cascade" }).notNull(),
  sectorId: integer("sector_id").references(() => sectors.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: ["draft", "published"] }).default("draft").notNull(),
  shareLink: text("share_link").notNull().unique(), // nanoid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleDates = pgTable("schedule_dates", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => schedules.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
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

// Relations
export const ministriesRelations = relations(ministries, ({ one, many }) => ({
  sectors: many(sectors),
  leader: one(users, { fields: [ministries.leaderId], references: [users.id] }),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  ministry: one(ministries, { fields: [sectors.ministryId], references: [ministries.id] }),
  servants: many(servants),
  schedules: many(schedules),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  servant: one(servants),
  ministriesLed: many(ministries),
}));

export const servantsRelations = relations(servants, ({ one, many }) => ({
  user: one(users, { fields: [servants.userId], references: [users.id] }),
  sector: one(sectors, { fields: [servants.sectorId], references: [sectors.id] }),
  availabilities: many(scheduleAvailability),
  assignments: many(scheduleAssignments),
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

export const scheduleDatesRelations = relations(scheduleDates, ({ one, many }) => ({
  schedule: one(schedules, { fields: [scheduleDates.scheduleId], references: [schedules.id] }),
  availabilities: many(scheduleAvailability),
  assignments: many(scheduleAssignments),
}));
