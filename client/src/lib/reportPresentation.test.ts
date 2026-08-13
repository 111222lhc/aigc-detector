import { describe, expect, it } from "vitest";
import { buildSegmentsCsv, createReportCode, getDistributionRows, getReportConclusion, getReviewSegments } from "./reportPresentation";

describe("三色报告展示模型", () => {
  it("以绿、橙、红的固定顺序生成风险分布数据", () => {
    expect(getDistributionRows({ low: 3, medium: 2, high: 1 }).map(item => item.name)).toEqual(["低风险", "中风险", "高风险"]);
  });

  it("仅展示橙色和红色窗口，并按风险分从高到低截取前五项", () => {
    const scores = [8, 42, 91, 30, 70, 36, 80].map(score => ({ score }));
    expect(getReviewSegments(scores).map(item => item.score)).toEqual([91, 80, 70, 42, 36]);
  });

  it("为固定报告输入生成可重复的编号与非裁决性结论", () => {
    const code = createReportCode("测试论文", 61, 1200, new Date("2026-08-13T00:00:00Z"));
    expect(code).toMatch(/^WX-20260813-[A-Z0-9]{5}$/);
    expect(getReportConclusion("high").heading).toBe("建议优先人工复核");
    expect(getReportConclusion("low").detail).toContain("不等同于确认人类写作");
  });

  it("导出明细会保留中文字段并正确转义原文中的双引号", () => {
    const csv = buildSegmentsCsv("论文\"标题", "WX-20260813-ABCDE", [{ position: 1, score: 76, riskLevel: "high", charCount: 128, content: "含有\"引号\"的片段" }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"论文""标题"');
    expect(csv).toContain('"含有""引号""的片段"');
  });
});
