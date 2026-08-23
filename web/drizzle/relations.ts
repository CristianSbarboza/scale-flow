import { relations } from "drizzle-orm/relations";
import { schedules, scheduleDates, scheduleAssignments, servants, scheduleAvailability, ministries, sectors, users } from "./schema";

export const scheduleDatesRelations = relations(scheduleDates, ({one, many}) => ({
	schedule: one(schedules, {
		fields: [scheduleDates.scheduleId],
		references: [schedules.id]
	}),
	scheduleAssignments: many(scheduleAssignments),
	scheduleAvailabilities: many(scheduleAvailability),
}));

export const schedulesRelations = relations(schedules, ({one, many}) => ({
	scheduleDates: many(scheduleDates),
	ministry: one(ministries, {
		fields: [schedules.ministryId],
		references: [ministries.id]
	}),
	sector: one(sectors, {
		fields: [schedules.sectorId],
		references: [sectors.id]
	}),
}));

export const scheduleAssignmentsRelations = relations(scheduleAssignments, ({one}) => ({
	scheduleDate: one(scheduleDates, {
		fields: [scheduleAssignments.dateId],
		references: [scheduleDates.id]
	}),
	servant: one(servants, {
		fields: [scheduleAssignments.servantId],
		references: [servants.id]
	}),
}));

export const servantsRelations = relations(servants, ({one, many}) => ({
	scheduleAssignments: many(scheduleAssignments),
	scheduleAvailabilities: many(scheduleAvailability),
	user: one(users, {
		fields: [servants.userId],
		references: [users.id]
	}),
	sector: one(sectors, {
		fields: [servants.sectorId],
		references: [sectors.id]
	}),
}));

export const scheduleAvailabilityRelations = relations(scheduleAvailability, ({one}) => ({
	scheduleDate: one(scheduleDates, {
		fields: [scheduleAvailability.dateId],
		references: [scheduleDates.id]
	}),
	servant: one(servants, {
		fields: [scheduleAvailability.servantId],
		references: [servants.id]
	}),
}));

export const ministriesRelations = relations(ministries, ({many}) => ({
	schedules: many(schedules),
	sectors: many(sectors),
}));

export const sectorsRelations = relations(sectors, ({one, many}) => ({
	schedules: many(schedules),
	ministry: one(ministries, {
		fields: [sectors.ministryId],
		references: [ministries.id]
	}),
	servants: many(servants),
}));

export const usersRelations = relations(users, ({many}) => ({
	servants: many(servants),
}));