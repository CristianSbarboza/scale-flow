import { pgTable, foreignKey, serial, integer, date, time, unique, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const scheduleDates = pgTable("schedule_dates", {
	id: serial().primaryKey().notNull(),
	scheduleId: integer("schedule_id").notNull(),
	date: date().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [schedules.id],
			name: "schedule_dates_schedule_id_schedules_id_fk"
		}).onDelete("cascade"),
]);

export const scheduleAssignments = pgTable("schedule_assignments", {
	id: serial().primaryKey().notNull(),
	dateId: integer("date_id").notNull(),
	servantId: integer("servant_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.dateId],
			foreignColumns: [scheduleDates.id],
			name: "schedule_assignments_date_id_schedule_dates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.servantId],
			foreignColumns: [servants.id],
			name: "schedule_assignments_servant_id_servants_id_fk"
		}).onDelete("cascade"),
]);

export const scheduleAvailability = pgTable("schedule_availability", {
	id: serial().primaryKey().notNull(),
	dateId: integer("date_id").notNull(),
	servantId: integer("servant_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.dateId],
			foreignColumns: [scheduleDates.id],
			name: "schedule_availability_date_id_schedule_dates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.servantId],
			foreignColumns: [servants.id],
			name: "schedule_availability_servant_id_servants_id_fk"
		}).onDelete("cascade"),
]);

export const schedules = pgTable("schedules", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	ministryId: integer("ministry_id").notNull(),
	sectorId: integer("sector_id").notNull(),
	status: text().default('draft').notNull(),
	shareLink: text("share_link").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ministryId],
			foreignColumns: [ministries.id],
			name: "schedules_ministry_id_ministries_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sectorId],
			foreignColumns: [sectors.id],
			name: "schedules_sector_id_sectors_id_fk"
		}).onDelete("cascade"),
	unique("schedules_share_link_unique").on(table.shareLink),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	role: text().default('servant').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const sectors = pgTable("sectors", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	ministryId: integer("ministry_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ministryId],
			foreignColumns: [ministries.id],
			name: "sectors_ministry_id_ministries_id_fk"
		}).onDelete("cascade"),
]);

export const servants = pgTable("servants", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sectorId: integer("sector_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "servants_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sectorId],
			foreignColumns: [sectors.id],
			name: "servants_sector_id_sectors_id_fk"
		}).onDelete("cascade"),
]);

export const ministries = pgTable("ministries", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
