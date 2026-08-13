import { describe, expect, it } from "vitest";
import { getDistributionRows, getReviewSegments } from "./reportPresentation";

describe("三色报告展示模型", () => {
  it("以绿、橙、红的固定顺序生成风险分布数据", () => {
    expect(getDistributionRows({ low: 3, medium: 2, high: 1 }).map(item => item.name)).toEqual(["低风险", "中风险", "高风险"]);
  });

  it("仅展示橙色和红色窗口，并按风险分从高到低截取前五项", () => {
    const scores = [8, 42, 91, 30, 70, 36, 80].map(score => ({ score }));
    expect(getReviewSegments(scores).map(item => item.score)).toEqual([91, 80, 70, 42, 36]);
  });
});
