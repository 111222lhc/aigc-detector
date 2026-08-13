import React from "react";
import { Button } from "@/components/ui/button";
import type { ReportData } from "@/components/ReportPanel";
import { ArrowRight, BarChart3, CircleCheck, FileText, Save, ScanSearch } from "lucide-react";

type AnalysisSummaryProps = {
  report: ReportData;
  title: string;
  fileName?: string | null;
  onOpenReport: () => void;
  onSave?: () => void;
  saving?: boolean;
};

const riskStyles = {
  low: { label: "低风险", color: "text-[#28724c]", bg: "bg-[#ebf7ef]", border: "border-[#cbe8d4]", copy: "文本特征整体偏向低风险，仍建议结合写作过程人工复核。" },
  medium: { label: "需要复核", color: "text-[#a76a18]", bg: "bg-[#fff6e8]", border: "border-[#f1dcaa]", copy: "存在需要重点核对的窗口，建议查看完整报告中的证据定位。" },
  high: { label: "高风险窗口", color: "text-[#b04832]", bg: "bg-[#fff0eb]", border: "border-[#f1c8bd]", copy: "存在高风险窗口，请优先回到完整报告核对原文与写作过程。" },
};

export function AnalysisSummary({ report, title, fileName, onOpenReport, onSave, saving }: AnalysisSummaryProps) {
  const risk = riskStyles[report.riskLevel];
  return <section id="result-summary" className="mt-8 overflow-hidden rounded-2xl border border-[#d8e5da] bg-white shadow-[0_16px_40px_rgba(38,58,43,0.06)]">
    <div className="border-b border-[#e6ede6] bg-[#f3f8f3] px-5 py-4 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium text-[#496453]"><CircleCheck size={17} className="text-[#377b53]" />分析完成 · 仅展示摘要</div><span className="font-mono text-[11px] text-[#839186]">{report.modelVersion}</span></div></div>
    <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center"><div className={`rounded-2xl border ${risk.border} ${risk.bg} p-5`}><div className="text-xs font-semibold tracking-[0.14em] text-[#76867c]">总体文本风险分</div><div className="mt-2 flex items-end gap-2"><span className={`text-6xl font-semibold tracking-[-0.07em] ${risk.color}`}>{report.overallScore}</span><span className="mb-2 text-sm text-[#748178]">/ 100</span></div><span className={`mt-3 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold ${risk.color}`}>{risk.label}</span></div>
      <div><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[#718276]"><ScanSearch size={15} />检测摘要</div><h2 className="mt-2 text-xl font-semibold text-[#26392e]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#66756c]">{risk.copy}</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="检测字符" value={report.charCount.toLocaleString()} /><Metric label="分析窗口" value={String(report.segmentCount)} /><Metric label="重点复核" value={String(report.distribution.high + report.distribution.medium)} /><Metric label="高风险窗口" value={String(report.distribution.high)} /></div><p className="mt-4 flex items-center gap-2 text-xs text-[#849087]"><FileText size={14} />{fileName ? `已解析文件：${fileName}` : "粘贴文本已完成分析"}。完整原文和逐段证据不会在本页展开。</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button onClick={onOpenReport} className="bg-[#286843] hover:bg-[#1f5737]"><BarChart3 size={17} />查看完整报告<ArrowRight size={17} /></Button>{onSave && <Button variant="outline" onClick={onSave} disabled={saving} className="border-[#cfddcf] text-[#486551]"><Save size={16} />{saving ? "正在保存" : "保存至报告历史"}</Button>}</div></div>
    </div>
    <div className="border-t border-[#e8eee8] px-5 py-3 text-xs leading-5 text-[#7d8b81] sm:px-7">本页仅提供总览，不展示全文。请在完整报告中查看窗口原文、三色标注、导出与打印版。</div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e2eae2] bg-[#fbfcfb] px-3 py-3"><div className="text-[11px] text-[#849087]">{label}</div><div className="mt-1 text-lg font-semibold text-[#34513d]">{value}</div></div>;
}
