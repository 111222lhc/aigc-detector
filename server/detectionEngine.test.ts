import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { analyzeText, getRiskLevel, scoreTextWindow } from "./detectionEngine";

describe("detection engine", () => {
  const text = "本文围绕城市公共空间的更新展开讨论。研究首先说明观察对象与时间范围，再从步行体验、公共服务和历史保留三个层面进行分析。通过对若干街区的连续记录，可以发现管理策略需要兼顾通行效率与居民日常使用。最后，文章提出以小尺度试点、阶段评估和社区反馈相结合的推进方式。".repeat(3);

  it("returns bounded deterministic scores for a valid document", () => {
    const first = analyzeText(text);
    const second = analyzeText(text);
    expect(first.overallScore).toBeGreaterThanOrEqual(0);
    expect(first.overallScore).toBeLessThanOrEqual(100);
    expect(first.overallScore).toBe(second.overallScore);
    expect(first.segmentCount).toBeGreaterThan(0);
    expect(first.segments.reduce((sum, segment) => sum + segment.charCount, 0)).toBe(first.charCount);
  });

  it("uses the documented three-color threshold boundaries", () => {
    expect(getRiskLevel(29)).toBe("low");
    expect(getRiskLevel(30)).toBe("medium");
    expect(getRiskLevel(69)).toBe("medium");
    expect(getRiskLevel(70)).toBe("high");
    expect(scoreTextWindow(text)).toBeGreaterThanOrEqual(0);
  });

  it("exposes the same analysis through the public detection procedure", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    const report = await caller.detection.analyze({ title: "接口测试", sourceType: "text", text });
    expect(report.charCount).toBeGreaterThanOrEqual(120);
    expect(report.modelVersion).toContain("iter5-char");
  });
});
