// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ReportPanel", () => ({
  ReportPanel: ({ report, title }: { report: { segments: { content: string }[] }; title: string }) => <section data-testid="full-report"><h1>{title}</h1><p>{report.segments[0].content}</p><span>重点复核窗口</span><button>导出 PDF</button><button>下载明细</button></section>,
}));

import ReportPreview from "./ReportPreview";

const preview = {
  title: "课程论文",
  createdAt: 1786600000000,
  report: {
    overallScore: 55,
    riskLevel: "medium",
    charCount: 771,
    segmentCount: 2,
    modelVersion: "iter5-char-2to4gram",
    distribution: { low: 0, medium: 2, high: 0 },
    segments: [{ position: 1, content: "这段完整原文仅应在详细报告页显示。", score: 59, riskLevel: "medium", charCount: 20 }],
  },
};

beforeEach(() => sessionStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ReportPreview", () => {
  it("从会话临时结果呈现完整逐段报告与导出入口", () => {
    sessionStorage.setItem("wenxi-report-preview", JSON.stringify(preview));
    render(<ReportPreview />);

    expect(screen.getByTestId("full-report")).toBeTruthy();
    expect(screen.getByText("课程论文")).toBeTruthy();
    expect(screen.getByText("这段完整原文仅应在详细报告页显示。")).toBeTruthy();
    expect(screen.getByText("重点复核窗口")).toBeTruthy();
    expect(screen.getByRole("button", { name: "导出 PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "下载明细" })).toBeTruthy();
  });

  it("在没有临时结果时明确告知预览已失效", () => {
    render(<ReportPreview />);
    expect(screen.getByText("本次报告预览已失效")).toBeTruthy();
  });
});
