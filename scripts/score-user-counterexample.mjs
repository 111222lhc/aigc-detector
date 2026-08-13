import { readFileSync } from "node:fs";
import { analyzeText } from "../server/detectionEngine.ts";

const record = JSON.parse(readFileSync("/home/ubuntu/aigc_detector/data/regression/user_counterexample_001.jsonl", "utf8"));
const report = analyzeText(record.text);
console.log(JSON.stringify({
  id: record.id,
  declaredLabel: record.label,
  genre: record.genre,
  charCount: record.text.length,
  modelVersion: report.modelVersion,
  overallScore: report.overallScore,
  riskLevel: report.riskLevel,
  segments: report.segments.map(({ position, score, riskLevel, charCount }) => ({ position, score, riskLevel, charCount })),
}, null, 2));
