import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  familyPhone: varchar("familyPhone", { length: 20 }).notNull(),
  isAdult: boolean("isAdult").notNull(),
  team: mysqlEnum("team", ["FORCA_INTERVENCAO", "MILICIA_LOCAL"]).notNull(),
  wantsPatch: boolean("wantsPatch").notNull().default(false),
  wantsShirt: boolean("wantsShirt").notNull().default(false),
  shirtSize: mysqlEnum("shirtSize", ["P", "M", "G", "GG"]),
  hasCompanion: boolean("hasCompanion").notNull().default(false),
  companionCount: int("companionCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;
