// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  LabelList: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { ReportPanel, type ReportData } from "./ReportPanel";

const highRiskReport: ReportData = {
  overallScore: 74,
  riskLevel: "high",
  charCount: 1280,
  segmentCount: 3,
  modelVersion: "iter5-char-2to4gram",
  distribution: { low: 1, medium: 1, high: 1 },
  segments: [
    { position: 1, content: "这是低风险窗口。", score: 12, riskLevel: "low", charCount: 20 },
    { position: 2, content: "这是中风险窗口。", score: 46, riskLevel: "medium", charCount: 20 },
    { position: 3, content: "这是高风险窗口。", score: 88, riskLevel: "high", charCount: 20 },
  ],
};

beforeEach(() => {
  Object.defineProperty(window, "print", { configurable: true, value: vi.fn() });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:report") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReportPanel", () => {
  it("呈现专业报告的关键结论、分布与证据区块", () => {
    render(<ReportPanel report={highRiskReport} title="测试论文" savedAt="2026-08-13T00:00:00.000Z" />);

    expect(screen.getByText("检测报告")).toBeTruthy();
    expect(screen.getAllByText("建议优先人工复核")).toHaveLength(2);
    expect(screen.getByText("报告解读")).toBeTruthy();
    expect(screen.getByText("窗口检测明细")).toBeTruthy();
    expect(screen.getAllByText("重点复核窗口")).toHaveLength(2);
    expect(screen.getAllByText("这是高风险窗口。")).toHaveLength(4);
    expect(screen.getByLabelText("A4打印版文本特征评估报告")).toBeTruthy();
    expect(screen.getByText("原文证据稿")).toBeTruthy();
    expect(screen.getByText("检测范围与复核导航")).toBeTruthy();
  });

  it("支持保存、调用浏览器打印导出PDF，以及下载窗口明细CSV", () => {
    const onSave = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<ReportPanel report={highRiskReport} title="测试论文" savedAt="2026-08-13T00:00:00.000Z" onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "保存至报告历史" }));
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "导出 PDF" }));
    expect(window.print).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "下载明细" }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });

  it("在没有橙色和红色窗口时给出明确空态", () => {
    render(<ReportPanel report={{ ...highRiskReport, overallScore: 15, riskLevel: "low", distribution: { low: 3, medium: 0, high: 0 }, segments: highRiskReport.segments.map(segment => ({ ...segment, score: 15, riskLevel: "low" as const })) }} title="低风险论文" savedAt="2026-08-13T00:00:00.000Z" />);

    expect(screen.getByText("当前文档未出现橙色或红色风险窗口。")).toBeTruthy();
  });
});
