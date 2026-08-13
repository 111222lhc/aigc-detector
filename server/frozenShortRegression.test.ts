import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeText, scoreTextWindow } from "./detectionEngine";

type RegressionRow = {
  text: string;
  label: string;
  split: string;
  model: string;
  genre: string;
};

const corpusRoot = resolve(__dirname, "../../aigc_detector/data");
const holdoutPath = join(corpusRoot, "regression/short_ai_holdout.jsonl");

function readJsonl(path: string): RegressionRow[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line) as RegressionRow);
}

function readShortTrainingTexts(): Set<string> {
  const files = [join(corpusRoot, "short_human_train.jsonl")];
  const shortAiDir = join(corpusRoot, "short_ai_train");
  if (existsSync(shortAiDir)) {
    for (const file of readdirSync(shortAiDir)) {
      if (file.endsWith(".jsonl")) files.push(join(shortAiDir, file));
    }
  }
  return new Set(files.flatMap(path => existsSync(path) ? readJsonl(path).map(row => row.text.trim()) : []));
}

describe("冻结短抒情回归集", () => {
  const rows = readJsonl(holdoutPath);

  it("只包含标记为永不训练的AI短抒情样本，且覆盖两个生成模型", () => {
    expect(rows.length).toBeGreaterThanOrEqual(33);
    expect(rows.every(row => row.label === "ai" && row.genre === "short_reflective")).toBe(true);
    expect(rows.every(row => row.split === "regression_only_never_train")).toBe(true);
    expect(new Set(rows.map(row => row.model)).size).toBeGreaterThanOrEqual(2);
  });

  it("与本轮短文本训练语料没有文本重合", () => {
    const trainingTexts = readShortTrainingTexts();
    expect(rows.some(row => trainingTexts.has(row.text.trim()))).toBe(false);
  });

  it("使用网页实际Iter5字符引擎得到可审计且界内的窗口评分", () => {
    const scores = rows.map(row => scoreTextWindow(row.text));
    expect(scores).toHaveLength(rows.length);
    expect(scores.every(score => Number.isInteger(score) && score >= 0 && score <= 100)).toBe(true);

    const webEligibleRows = rows.filter(row => row.text.length >= 120);
    expect(webEligibleRows.length).toBeGreaterThanOrEqual(4);
    for (const row of webEligibleRows) {
      const report = analyzeText(row.text);
      expect(report.modelVersion).toBe("iter5-char-2to4gram");
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    }
  });
});
