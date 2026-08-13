import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";
import { AlertTriangle, ChevronRight, FileText, Printer, ScanSearch, ShieldCheck } from "lucide-react";
import { getDistributionRows, getReviewSegments, RISK_META } from "@/lib/reportPresentation";

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
    <div className="relative grid h-44 w-44 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${overallScore * 3.6}deg, #edf0ed 0deg)` }}>
      <div className="grid h-[132px] w-[132px] place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(43,55,47,0.08)]">
        <div className="text-center">
          <div className="font-mono text-4xl font-semibold tracking-[-0.08em] text-[#1f2a25]">{overallScore}<span className="ml-1 text-lg text-[#728078]">%</span></div>
          <div className="mt-1 text-[11px] tracking-[0.16em] text-[#87938b]">AI特征风险分</div>
        </div>
      </div>
    </div>
  );
}

export function ReportPanel({ report, title, savedAt, onSave, saving }: { report: ReportData; title: string; savedAt?: Date | string; onSave?: () => void; saving?: boolean }) {
  const summaryData = getDistributionRows(report.distribution);
  const signalSegments = getReviewSegments(report.segments);
  const reportDate = savedAt ? new Date(savedAt).toLocaleString("zh-CN", { hour12: false }) : "本次检测";

  return (
    <section className="report-shell mt-10 pb-16" aria-label="AIGC检测报告">
      <div className="report-paper overflow-hidden rounded-[22px] border border-[#e1e7e1] bg-white shadow-[0_20px_60px_rgba(37,56,43,0.08)]">
        <div className="flex flex-col gap-5 border-b border-[#e4e9e4] bg-[#fbfcfa] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9f2ec] text-[#2f6d4b]"><ScanSearch size={21} /></div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-[#708078]">AIGC TEXT PROFILE</div>
              <h2 className="mt-1 truncate text-lg font-semibold text-[#24342b]">{title}</h2>
              <p className="mt-1 text-xs text-[#7b8980]">{reportDate} · 模型 {report.modelVersion}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onSave && <Button onClick={onSave} disabled={saving} className="bg-[#286843] text-white hover:bg-[#1f5737]">{saving ? "正在保存" : "保存报告"}<ChevronRight size={16} /></Button>}
            <Button variant="outline" onClick={() => window.print()} className="border-[#d8e1d9] text-[#486057] hover:bg-[#f3f7f3]"><Printer size={16} />打印</Button>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-center justify-center border-b border-[#e6ece6] pb-8 lg:flex-row lg:gap-9 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <ScoreRing overallScore={report.overallScore} riskLevel={report.riskLevel} />
            <div className="mt-5 text-center lg:mt-0 lg:text-left">
              <Badge className="border-0 px-2.5 py-1 text-xs" style={{ color: RISK_META[report.riskLevel].color, background: RISK_META[report.riskLevel].soft }}>{RISK_META[report.riskLevel].label}</Badge>
              <h3 className="mt-3 text-xl font-semibold text-[#25372d]">{RISK_META[report.riskLevel].text}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#6f7d74]">评分反映文本模式与训练语料中生成文本特征的接近程度，建议结合写作过程与原始资料进行人工复核。</p>
              <div className="mt-5 flex justify-center gap-6 lg:justify-start">
                <div><div className="font-mono text-lg font-semibold text-[#2b3a32]">{report.charCount.toLocaleString()}</div><div className="text-[11px] text-[#849087]">有效字符</div></div>
                <div><div className="font-mono text-lg font-semibold text-[#2b3a32]">{report.segmentCount}</div><div className="text-[11px] text-[#849087]">检测分段</div></div>
              </div>
            </div>
          </div>
          <div className="min-h-[240px]">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-semibold text-[#2c3c33]">分段风险分布</div><div className="mt-1 text-xs text-[#849087]">按检测窗口的三色分级统计</div></div><FileText size={18} className="text-[#8b9a90]" /></div>
            <ChartContainer config={{ value: { label: "分段数量" } }} className="h-[205px] w-full">
              <BarChart data={summaryData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid horizontal={false} stroke="#edf0ed" />
                <YAxis dataKey="name" type="category" width={52} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#78867d" }} />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={20}>
                  {summaryData.map(item => <Cell key={item.name} fill={item.fill} />)}
                  <LabelList dataKey="value" position="right" fill="#6f7d74" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="border-y border-[#e8ede8] bg-[#fbfcfa] px-6 py-4 sm:px-9">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#627269]">
            <span className="font-medium text-[#41534a]">分级说明</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#3c8a61]" />绿色 0–29%</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#cf7a2a]" />橙色 30–69%</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#c94545]" />红色 70–100%</span>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-9">
          <div className="mb-5 flex items-end justify-between gap-5"><div><h3 className="text-base font-semibold text-[#293a30]">段落检测明细</h3><p className="mt-1 text-xs text-[#839087]">按原文顺序呈现；颜色越深表示该窗口的生成文本特征风险越高。</p></div><Badge variant="outline" className="border-[#dce5dc] text-[#68786e]">{report.segmentCount} 个窗口</Badge></div>
          <div className="overflow-hidden rounded-xl border border-[#e4ebe4]">
            <div className="hidden grid-cols-[78px_1fr_90px_80px] gap-4 border-b border-[#e8ede8] bg-[#f7f9f7] px-5 py-3 text-[11px] font-semibold tracking-[0.08em] text-[#859188] sm:grid"><span>位置</span><span>原文片段</span><span>风险分</span><span>等级</span></div>
            {report.segments.map(segment => {
              const meta = RISK_META[segment.riskLevel];
              return <div key={segment.position} className="grid gap-3 border-b border-[#edf0ed] px-4 py-4 last:border-b-0 sm:grid-cols-[78px_1fr_90px_80px] sm:items-start sm:gap-4 sm:px-5">
                <span className="font-mono text-xs text-[#839087]">#{String(segment.position).padStart(2, "0")}</span>
                <p className="text-sm leading-7 text-[#43534a]"><span className="rounded px-1.5 py-0.5" style={{ background: meta.soft }}>{segment.content}</span></p>
                <span className="font-mono text-xl font-semibold" style={{ color: meta.color }}>{segment.score}%</span>
                <Badge className="w-fit border-0" style={{ color: meta.color, background: meta.soft }}>{meta.label}</Badge>
              </div>;
            })}
          </div>
        </div>

        <div className="border-t border-[#e8ede8] bg-[#fffdf9] px-6 py-8 sm:px-9">
          <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-[#b76b25]" /><h3 className="text-base font-semibold text-[#3d4230]">需要重点复核的片段</h3></div>
          {signalSegments.length ? <div className="mt-4 grid gap-3">{signalSegments.slice(0, 5).map(segment => <div key={segment.position} className="flex gap-3 rounded-xl border border-[#f0dfcc] bg-white px-4 py-3"><span className="mt-0.5 font-mono text-xs text-[#a76a32]">#{String(segment.position).padStart(2, "0")}</span><p className="min-w-0 flex-1 text-sm leading-6 text-[#665646]">{segment.content}</p><span className="font-mono text-sm font-semibold text-[#c46a26]">{segment.score}%</span></div>)}</div> : <div className="mt-4 rounded-xl border border-[#e2eee5] bg-white px-4 py-4 text-sm text-[#5e7c68]"><ShieldCheck className="mr-2 inline h-4 w-4" />当前文档未出现橙色或红色风险窗口。</div>}
        </div>
      </div>
    </section>
  );
}
