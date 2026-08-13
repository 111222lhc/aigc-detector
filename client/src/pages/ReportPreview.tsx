import React from "react";
import { Button } from "@/components/ui/button";
import { ReportPanel, type ReportData } from "@/components/ReportPanel";
import { ArrowLeft, FileWarning } from "lucide-react";
import { Link } from "wouter";

const previewStorageKey = "wenxi-report-preview";
type StoredPreview = { title: string; report: ReportData; fileName?: string | null; createdAt: number };

// 由 server/printLiveAuditFixture.ts 调用当前 Iter5 引擎生成；只用于开发环境的页面核验。
const actualAuditPreview: StoredPreview = {
  title: "真实检测结果全链路核验文档",
  fileName: "形势与政策结课论文.pdf",
  createdAt: 1786600000000,
  report: {
    overallScore: 55,
    riskLevel: "medium",
    charCount: 771,
    segmentCount: 2,
    modelVersion: "iter5-char-2to4gram",
    distribution: { low: 0, medium: 2, high: 0 },
    segments: [
      { position: 1, score: 59, riskLevel: "medium", charCount: 596, content: "本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。" },
      { position: 2, score: 43, riskLevel: "medium", charCount: 175, content: "为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。" },
    ],
  },
};

function readPreview(): StoredPreview | null {
  try {
    const raw = sessionStorage.getItem(previewStorageKey);
    return raw ? JSON.parse(raw) as StoredPreview : null;
  } catch { return null; }
}

export default function ReportPreview() {
  const isAuditPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("preview-audit");
  const preview = readPreview() ?? (isAuditPreview ? actualAuditPreview : null);
  if (!preview) return <main className="grid min-h-screen place-items-center bg-[#f3f7f3] px-5 text-center"><div className="max-w-md"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f1e8] text-[#3a7652]"><FileWarning size={23} /></span><h1 className="mt-5 text-xl font-semibold text-[#2d4034]">本次报告预览已失效</h1><p className="mt-2 text-sm leading-6 text-[#718076]">临时报告仅保留在当前浏览器会话中。请返回检测页重新分析，或登录后从报告历史查看已保存版本。</p><Link href="/"><Button className="mt-5 bg-[#286843]"><ArrowLeft size={16} />返回检测页</Button></Link></div></main>;
  return <main className="min-h-screen bg-[#f1f5f1] px-4 py-7 sm:px-7"><div className="mx-auto max-w-6xl"><Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-[#5e7568] hover:text-[#286843] print:hidden"><ArrowLeft size={16} />返回检测页</Link><ReportPanel report={preview.report} title={preview.title} savedAt={new Date(preview.createdAt)} /></div></main>;
}
