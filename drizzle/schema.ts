import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

export const detectionReports = mysqlTable("detectionReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["text", "txt", "docx", "pdf"]).notNull(),
  overallScore: int("overallScore").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).notNull(),
  charCount: int("charCount").notNull(),
  segmentCount: int("segmentCount").notNull(),
  modelVersion: varchar("modelVersion", { length: 64 }).notNull(),
  distributionJson: text("distributionJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("report_user_created_idx").on(table.userId, table.createdAt)]);

export const detectionSegments = mysqlTable("detectionSegments", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  position: int("position").notNull(),
  content: text("content").notNull(),
  score: int("score").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).notNull(),
  charCount: int("charCount").notNull(),
}, table => [index("segment_report_position_idx").on(table.reportId, table.position)]);

export type DetectionReport = typeof detectionReports.$inferSelect;
export type InsertDetectionReport = typeof detectionReports.$inferInsert;
export type DetectionSegment = typeof detectionSegments.$inferSelect;
export type InsertDetectionSegment = typeof detectionSegments.$inferInsert;
