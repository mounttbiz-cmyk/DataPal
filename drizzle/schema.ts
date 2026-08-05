import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Search history — stores each scrape query the user performs.
 */
export const searchHistory = sqliteTable("searchHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  businessType: text("businessType").notNull(),
  location: text("location").notNull(),
  requirement: text("requirement"),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending").notNull(),
  resultsCount: integer("resultsCount").default(0),
  sources: text("sources"),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * Scraped business results — individual business records.
 */
export const businessResults = sqliteTable("businessResults", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  searchId: integer("searchId").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  category: text("category"),
  source: text("source", { enum: ["google_maps", "justdial", "indiamart", "linkedin", "yellowpages", "tradeindia", "other"] }).default("google_maps"),
  rating: text("rating"),
  existingPresence: text("existingPresence"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }),
});

export type BusinessResult = typeof businessResults.$inferSelect;
export type InsertBusinessResult = typeof businessResults.$inferInsert;
