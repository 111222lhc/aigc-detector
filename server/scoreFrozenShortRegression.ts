import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeText, scoreTextWindow } from "./detectionEngine";

type RegressionRow = {
  text: string;
  model: string;
  topic: string;
  split: string;
  genre: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const corpusRoot = resolve(scriptDirectory, "../../aigc_detector");
const sourcePath = resolve(corpusRoot, "data/regression/short_ai_holdout.jsonl");
const outputPath = resolve(corpusRoot, "reports/frozen_short_regression_iter5_web.json");
const rows: RegressionRow[] = readFileSync(sourcePath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line) as RegressionRow);

const results = rows.map(row => {
  const score = scoreTextWindow(row.text);
  const webEligible = row.text.length >= 120;
  return {
    topic: row.topic,
    sourceModel: row.model,
    charCount: row.text.length,
    webEligible,
    score,
    riskLevel: score >= 70 ? "high" : score >= 30 ? "medium" : "low",
    overallScore: webEligible ? analyzeText(row.text).overallScore : null,
  };
});

const eligible = results.filter(row => row.webEligible);
const summary = {
  evaluatedAt: new Date().toISOString(),
  dataset: "short_ai_holdout.jsonl",
  datasetSplit: "regression_only_never_train",
  modelVersion: "iter5-char-2to4gram",
  totalRows: results.length,
  webEligibleRows: eligible.length,
  belowWebMinimumRows: results.length - eligible.length,
  scoreOnlyAiDetectionRateAt50: results.filter(row => row.score >= 50).length / results.length,
  webEligibleAiDetectionRateAt50: eligible.length
    ? eligible.filter(row => (row.overallScore ?? 0) >= 50).length / eligible.length
    : null,
  note: "文本低于120字符时，网页入口会拒绝分析；此类文本保留score字段，仅用于内部特征敏感性审计，不能计入网页端可用性结论。",
};

writeFileSync(outputPath, JSON.stringify({ summary, results }, null, 2) + "\n", "utf8");
console.log(JSON.stringify(summary, null, 2));
