import { and, desc, eq } from "drizzle-orm";
import { detectionReports, detectionSegments } from "../drizzle/schema";
import type { DetectionReportResult } from "./detectionEngine";
import { getDb } from "./db";

export async function saveReportForUser(userId: number, title: string, sourceType: "text" | "txt" | "docx" | "pdf", report: DetectionReportResult) {
  const db = await getDb();
  if (!db) throw new Error("报告存储暂不可用，请稍后重试。");
  const inserted = await db.insert(detectionReports).values({
    userId,
    title: title.slice(0, 255),
    sourceType,
    overallScore: report.overallScore,
    riskLevel: report.riskLevel,
    charCount: report.charCount,
    segmentCount: report.segmentCount,
    modelVersion: report.modelVersion,
    distributionJson: JSON.stringify(report.distribution),
  }).$returningId();
  const reportId = inserted[0]?.id;
  if (!reportId) throw new Error("报告保存失败。");
  await db.insert(detectionSegments).values(report.segments.map(segment => ({
    reportId,
    position: segment.position,
    content: segment.content,
    score: segment.score,
    riskLevel: segment.riskLevel,
    charCount: segment.charCount,
  })));
  return reportId;
}

export async function listReportsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: detectionReports.id,
    title: detectionReports.title,
    sourceType: detectionReports.sourceType,
    overallScore: detectionReports.overallScore,
    riskLevel: detectionReports.riskLevel,
    charCount: detectionReports.charCount,
    segmentCount: detectionReports.segmentCount,
    createdAt: detectionReports.createdAt,
  }).from(detectionReports).where(eq(detectionReports.userId, userId)).orderBy(desc(detectionReports.createdAt)).limit(30);
}

export async function getReportForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(detectionReports).where(and(eq(detectionReports.id, id), eq(detectionReports.userId, userId))).limit(1);
  const report = rows[0];
  if (!report) return undefined;
  const segments = await db.select().from(detectionSegments).where(eq(detectionSegments.reportId, report.id)).orderBy(detectionSegments.position);
  return { ...report, distribution: JSON.parse(report.distributionJson) as Record<"low" | "medium" | "high", number>, segments };
}
