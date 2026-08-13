// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisSummary } from "./AnalysisSummary";

const report = {
  overallScore: 56,
  riskLevel: "medium" as const,
  charCount: 1240,
  segmentCount: 3,
  modelVersion: "iter5-char-2to4gram",
  distribution: { low: 1, medium: 2, high: 0 },
  segments: [
    { position: 1, content: "这段原文只应出现在详细报告页。", score: 51, riskLevel: "medium" as const, charCount: 24 },
  ],
};

describe("AnalysisSummary", () => {
  it("只呈现总体摘要，并将完整证据留给独立报告页", () => {
    const onOpenReport = vi.fn();
    const onSave = vi.fn();
    render(<AnalysisSummary report={report} title="课程论文" fileName="课程论文.docx" onOpenReport={onOpenReport} onSave={onSave} />);

    expect(screen.getByText("分析完成 · 仅展示摘要")).toBeTruthy();
    expect(screen.getByText("总体文本风险分")).toBeTruthy();
    expect(screen.getByText("查看完整报告")).toBeTruthy();
    expect(screen.queryByText("这段原文只应出现在详细报告页。")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "查看完整报告" }));
    fireEvent.click(screen.getByRole("button", { name: "保存至报告历史" }));
    expect(onOpenReport).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
