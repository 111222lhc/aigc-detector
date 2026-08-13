import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileCheck2, FileText, Printer, ScanSearch, ShieldCheck, TableProperties } from "lucide-react";
import { buildSegmentsCsv, createReportCode, getDistributionRows, getReportConclusion, getReviewSegments, RISK_META } from "@/lib/reportPresentation";
import React from "react";

export type ReportSegment = {
  position: number;
  content: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  charCount: number;
};

export type ReportData = {
  overallScore: number;
  riskLevel: "low" | "medium" | "high";
  charCount: number;
  segmentCount: number;
  modelVersion: string;
  distribution: Record<"low" | "medium" | "high", number>;
  segments: ReportSegment[];
};

function ScoreRing({ overallScore, riskLevel }: Pick<ReportData, "overallScore" | "riskLevel">) {
  const { color } = RISK_META[riskLevel];
  return (
    <div className="relative grid h-44 w-44 place-items-center rounded-full report-score-ring" style={{ background: `conic-gradient(${color} ${overallScore * 3.6}deg, #e9efea 0deg)` }}>
      <div className="grid h-[132px] w-[132px] place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(43,55,47,0.08)]">
        <div className="text-center">
          <div className="font-mono text-4xl font-semibold tracking-[-0.08em] text-[#1f2a25]">{overallScore}<span className="ml-1 text-lg text-[#728078]">%</span></div>
          <div className="mt-1 text-[11px] tracking-[0.16em] text-[#87938b]">AI 特征风险分</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, color = "#283c31" }: { label: string; value: string | number; detail: string; color?: string }) {
  return <div className="rounded-xl border border-[#e3eae3] bg-white px-4 py-4 report-avoid-break"><div className="text-[11px] font-semibold tracking-[0.13em] text-[#829087]">{label}</div><div className="mt-2 font-mono text-2xl font-semibold" style={{ color }}>{value}</div><div className="mt-1 text-xs text-[#7e8d83]">{detail}</div></div>;
}

function formatDate(date: Date) {
  return date.toLocaleString("zh-CN", { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ReportPanel({ report, title, savedAt, onSave, saving }: { report: ReportData; title: string; savedAt?: Date | string; onSave?: () => void; saving?: boolean }) {
  const summaryData = getDistributionRows(report.distribution);
  const signalSegments = getReviewSegments(report.segments);
  const issuedAt = savedAt ? new Date(savedAt) : new Date();
  const reportDate = formatDate(issuedAt);
  const reportCode = createReportCode(title, report.overallScore, report.charCount, issuedAt);
  const conclusion = getReportConclusion(report.riskLevel);
  const highCount = report.distribution.high;
  const reviewCount = report.distribution.high + report.distribution.medium;

  const exportPdf = () => {
    const originalTitle = document.title;
    document.title = `文析检测报告_${title}`.replace(/[\\/:*?"<>|]/g, "_");
    window.print();
    window.setTimeout(() => { document.title = originalTitle; }, 0);
  };

  const downloadDetails = () => {
    const content = buildSegmentsCsv(title, reportCode, report.segments);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportCode}_窗口明细.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="report-shell mt-10 pb-16" aria-label="AIGC文本特征检测报告">
      <article className="report-paper overflow-hidden rounded-[22px] border border-[#dbe5dc] bg-white shadow-[0_20px_60px_rgba(37,56,43,0.08)]">
        <header className="report-cover bg-[#173f2b] px-6 py-7 text-white sm:px-9 sm:py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-[#cfe0d3]"><FileCheck2 size={15} />文析 AIGC · 文本特征评估</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">检测报告</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#d5e1d7]">基于语料训练的生成文本特征分析。报告用于人工复核的优先级判断，不构成作者身份确认或学术诚信处置依据。</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-xs leading-5 text-[#d7e6d9] sm:min-w-56">
              <div className="text-[#9eb9a4]">报告编号</div><div className="mt-1 font-mono text-sm font-semibold tracking-wide text-white">{reportCode}</div>
              <div className="mt-2 text-[#9eb9a4]">生成时间</div><div className="mt-1 text-white">{reportDate}</div>
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-4 border-t border-white/12 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><div className="text-[11px] tracking-[0.15em] text-[#aac2af]">被检文档</div><h3 className="mt-1 truncate text-lg font-semibold text-white">{title}</h3></div>
            <div className="flex flex-wrap gap-2 report-actions">
              {onSave && <Button onClick={onSave} disabled={saving} className="bg-[#f5fbf6] text-[#215437] hover:bg-white">{saving ? "正在保存" : "保存至报告历史"}<ClipboardCheck size={16} /></Button>}
              <Button variant="outline" onClick={downloadDetails} className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><TableProperties size={16} />下载明细</Button>
              <Button variant="outline" onClick={exportPdf} className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" title="将在浏览器打印窗口中选择“另存为 PDF”"><Download size={16} />导出 PDF</Button>
            </div>
          </div>
        </header>

        <div className="border-b border-[#e5ece5] bg-[#f7faf7] px-6 py-4 sm:px-9">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#607267]"><span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#47835c]" />检测已完成</span><span>模型版本：{report.modelVersion}</span><span>分析单位：约600字符窗口</span><span>三色阈值：绿 0–29 / 橙 30–69 / 红 70–100</span></div>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="report-avoid-break border-b border-[#e6ece6] pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <ScoreRing overallScore={report.overallScore} riskLevel={report.riskLevel} />
              <div className="min-w-0 text-center sm:text-left">
                <Badge className="border-0 px-2.5 py-1 text-xs" style={{ color: RISK_META[report.riskLevel].color, background: RISK_META[report.riskLevel].soft }}>{RISK_META[report.riskLevel].label}</Badge>
                <h3 className="mt-3 text-xl font-semibold text-[#25372d]">{conclusion.heading}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#627369]">{conclusion.detail}</p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="有效字符" value={report.charCount.toLocaleString()} detail="纳入本次分析" />
              <StatCard label="检测窗口" value={report.segmentCount} detail="按原文顺序切分" />
              <StatCard label="重点复核" value={reviewCount} detail="橙色与红色窗口" color="#b36928" />
              <StatCard label="高风险窗口" value={highCount} detail="70分及以上" color="#bd4545" />
            </div>
          </section>

          <section className="report-avoid-break min-h-[265px]">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-semibold text-[#2c3c33]">窗口风险分布</div><div className="mt-1 text-xs text-[#849087]">按检测窗口的三色分级统计</div></div><FileText size={18} className="text-[#8b9a90]" /></div>
            <ChartContainer config={{ value: { label: "窗口数量" } }} className="h-[205px] w-full">
              <BarChart data={summaryData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid horizontal={false} stroke="#edf0ed" />
                <YAxis dataKey="name" type="category" width={52} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#78867d" }} />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={20}>{summaryData.map(item => <Cell key={item.name} fill={item.fill} />)}<LabelList dataKey="value" position="right" fill="#6f7d74" fontSize={12} /></Bar>
              </BarChart>
            </ChartContainer>
            <div className="report-print-distribution hidden" aria-label="窗口风险分布打印版">
              {summaryData.map(item => <div key={item.name} className="grid grid-cols-[46px_1fr_28px] items-center gap-3 text-xs text-[#66776d]"><span>{item.name}</span><span className="h-2.5 overflow-hidden rounded-full bg-[#edf1ed]"><span className="block h-full rounded-full" style={{ width: `${report.segmentCount ? Math.round((item.value / report.segmentCount) * 100) : 0}%`, background: item.fill }} /></span><strong className="font-mono font-semibold" style={{ color: item.fill }}>{item.value}</strong></div>)}
            </div>
          </section>
        </div>

        <section className="grid gap-4 border-y border-[#e6ece6] bg-[#fbfcfa] px-6 py-6 sm:px-9 lg:grid-cols-[1.05fr_0.95fr] report-avoid-break">
          <div><div className="flex items-center gap-2"><ScanSearch size={17} className="text-[#3b7b56]" /><h3 className="text-base font-semibold text-[#2c3c33]">报告解读</h3></div><p className="mt-2 max-w-xl text-sm leading-6 text-[#66776d]">风险分描述的是当前窗口与训练语料中生成文本特征的接近程度。它并非作者身份、原创性或违规事实的概率。优先阅读橙色、红色窗口，并保留人工判断的证据链。</p></div>
          <div className="rounded-xl border border-[#e3eae3] bg-white px-4 py-4"><div className="text-xs font-semibold text-[#456354]">建议复核路径</div><div className="mt-3 grid gap-2 text-xs leading-5 text-[#687a6e]"><p><b className="mr-2 text-[#2f6045]">01</b>核对提纲、草稿、版本历史与实验记录。</p><p><b className="mr-2 text-[#2f6045]">02</b>检查引文、数据来源与高风险窗口的上下文。</p><p><b className="mr-2 text-[#2f6045]">03</b>将本报告作为线索，而非单一结论。</p></div></div>
        </section>

        <section className="px-6 py-8 sm:px-9">
          <div className="mb-5 flex items-end justify-between gap-5"><div><div className="text-[11px] font-semibold tracking-[0.16em] text-[#718277]">EVIDENCE TABLE</div><h3 className="mt-1 text-lg font-semibold text-[#293a30]">窗口检测明细</h3><p className="mt-1 text-xs text-[#839087]">按原文顺序列出；颜色用于提示风险层级，不替代人工阅读与判断。</p></div><Badge variant="outline" className="border-[#dce5dc] text-[#68786e]">{report.segmentCount} 个窗口</Badge></div>
          <div className="overflow-hidden rounded-xl border border-[#e0e8e1]">
            <div className="report-table-head hidden grid-cols-[74px_1fr_90px_80px] gap-4 border-b border-[#e8ede8] bg-[#f4f7f4] px-5 py-3 text-[11px] font-semibold tracking-[0.08em] text-[#718077] sm:grid"><span>窗口</span><span>原文片段</span><span>风险分</span><span>等级</span></div>
            {report.segments.map(segment => {
              const meta = RISK_META[segment.riskLevel];
              return <div key={segment.position} className="report-detail-row grid gap-3 border-b border-[#edf0ed] px-4 py-4 last:border-b-0 sm:grid-cols-[74px_1fr_90px_80px] sm:items-start sm:gap-4 sm:px-5">
                <span className="font-mono text-xs text-[#72857a]">#{String(segment.position).padStart(2, "0")}</span>
                <p className="text-sm leading-7 text-[#405147]"><span className="rounded px-1.5 py-0.5" style={{ background: meta.soft }}>{segment.content}</span></p>
                <span className="font-mono text-xl font-semibold" style={{ color: meta.color }}>{segment.score}%</span>
                <Badge className="w-fit border-0" style={{ color: meta.color, background: meta.soft }}>{meta.label}</Badge>
              </div>;
            })}
          </div>
        </section>

        <section className="report-break-before border-t border-[#e8ede8] bg-[#fffdf9] px-6 py-8 sm:px-9">
          <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-[#b76b25]" /><h3 className="text-base font-semibold text-[#3d4230]">重点复核窗口</h3></div>
          {signalSegments.length ? <div className="mt-4 grid gap-3">{signalSegments.map(segment => <div key={segment.position} className="report-avoid-break flex gap-3 rounded-xl border border-[#f0dfcc] bg-white px-4 py-3"><span className="mt-0.5 font-mono text-xs text-[#a76a32]">#{String(segment.position).padStart(2, "0")}</span><p className="min-w-0 flex-1 text-sm leading-6 text-[#665646]">{segment.content}</p><span className="font-mono text-sm font-semibold text-[#c46a26]">{segment.score}%</span></div>)}</div> : <div className="mt-4 rounded-xl border border-[#e2eee5] bg-white px-4 py-4 text-sm text-[#5e7c68]"><ShieldCheck className="mr-2 inline h-4 w-4" />当前文档未出现橙色或红色风险窗口。</div>}
        </section>

        <footer className="border-t border-[#e6ece6] bg-white px-6 py-6 sm:px-9"><div className="flex flex-col justify-between gap-3 text-xs leading-5 text-[#75847a] sm:flex-row"><p>文析 AIGC 检测 · 模型版本 {report.modelVersion} · 报告编号 {reportCode}</p><p>请保留写作过程、参考文献与版本记录作为人工复核依据。</p></div></footer>
      </article>
    </section>
  );
}
