import { Button } from "@/components/ui/button";
import { ReportPanel, type ReportData } from "@/components/ReportPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const reportId = Number(params?.id);
  const { isAuthenticated, loading } = useAuth();
  const query = trpc.detection.get.useQuery({ id: reportId }, { enabled: isAuthenticated && Number.isInteger(reportId) && reportId > 0 });
  if (loading || query.isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-[#397c58]" /></div>;
  if (!isAuthenticated) return <main className="grid min-h-screen place-items-center px-5 text-center"><div><h1 className="text-xl font-semibold text-[#304137]">登录后查看报告详情</h1><p className="mt-2 text-sm text-[#7b8980]">已保存的报告仅向保存它的账户展示。</p><Button className="mt-5 bg-[#286843]" onClick={startLogin}>登录并继续</Button><Link href="/"><Button variant="link" className="mt-2 block text-[#63776a]">返回检测页</Button></Link></div></main>;
  if (!query.data) return <main className="grid min-h-screen place-items-center px-5 text-center"><div><h1 className="text-xl font-semibold text-[#304137]">未找到该报告</h1><p className="mt-2 text-sm text-[#7b8980]">报告可能不存在，或不属于当前账户。</p><Link href="/history"><Button variant="outline" className="mt-5">返回历史记录</Button></Link></div></main>;
  const report = query.data;
  const panel: ReportData = { overallScore: report.overallScore, riskLevel: report.riskLevel, charCount: report.charCount, segmentCount: report.segmentCount, modelVersion: report.modelVersion, distribution: report.distribution, segments: report.segments };
  return <main className="min-h-screen bg-[#f1f5f1] px-4 py-7 sm:px-7"><div className="mx-auto max-w-6xl"><Link href="/history" className="inline-flex items-center gap-1 text-sm text-[#5e7568] hover:text-[#286843]"><ArrowLeft size={16} />报告历史</Link><ReportPanel report={panel} title={report.title} savedAt={report.createdAt} /></div></main>;
}
