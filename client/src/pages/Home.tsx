import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { ReportPanel, type ReportData } from "@/components/ReportPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { validateFileInput, validateTextForAnalysis, type SourceType } from "@/lib/paperValidation";
import * as mammoth from "mammoth";
import { AlertCircle, ArrowRight, BookOpenCheck, FileUp, History, Loader2, ScanSearch, ShieldCheck, Sparkles, X } from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

async function extractFileText(file: File, sourceType: SourceType): Promise<string> {
  if (sourceType === "txt") return (await file.text()).trim();
  const buffer = await file.arrayBuffer();
  if (sourceType === "docx") return (await mammoth.extractRawText({ arrayBuffer: buffer })).value.trim();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => ("str" in item ? item.str : "")).join(""));
  }
  return pages.join("\n\n").trim();
}

const visualAuditReport: ReportData = {
  overallScore: 58,
  riskLevel: "medium",
  charCount: 1824,
  segmentCount: 4,
  modelVersion: "iter5-char-2to4gram",
  distribution: { low: 1, medium: 2, high: 1 },
  segments: [
    { position: 1, content: "本段用于开发环境下的报告视觉核验，展示低风险窗口在正式报告中的原文片段排版与颜色提示。", score: 18, riskLevel: "low", charCount: 48 },
    { position: 2, content: "本段用于开发环境下的报告视觉核验，展示中风险窗口的分数、标记层级和表格阅读体验。", score: 46, riskLevel: "medium", charCount: 47 },
    { position: 3, content: "本段用于开发环境下的报告视觉核验，展示高风险窗口在重点复核区域和逐段明细中的呈现方式。", score: 82, riskLevel: "high", charCount: 51 },
    { position: 4, content: "本段用于开发环境下的报告视觉核验，展示另一处中风险窗口以及长报告分页时的单元间距。", score: 51, riskLevel: "medium", charCount: 48 },
  ],
};

const liveAuditText = [
  "本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。",
  "为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。",
  "在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。",
].join("\n\n").repeat(3);

// 由 server/printLiveAuditFixture.ts 使用当前 Iter5 引擎生成；仅用于开发环境的同步视觉核验。
const actualModelAuditReport: ReportData = {
  overallScore: 55,
  riskLevel: "medium",
  charCount: 771,
  segmentCount: 2,
  modelVersion: "iter5-char-2to4gram",
  distribution: { low: 0, medium: 2, high: 0 },
  segments: [
    { position: 1, score: 59, riskLevel: "medium", charCount: 596, content: "本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。本研究围绕高校学习场景中的文本辅助工具展开观察。研究首先梳理不同写作任务的结构要求，再根据访谈记录与公开材料归纳使用者在资料检索、提纲调整和语言润色环节的常见做法。" },
    { position: 2, score: 43, riskLevel: "medium", charCount: 175, content: "为避免把单一语言特征直接等同于作者身份，分析过程保留了写作目标、引用记录、修改痕迹和版本演变等上下文信息。研究结果仅用于说明文本模式的统计差异，不构成对个人或作品来源的最终判断。在报告呈现方面，系统将较长文本切分为若干检测窗口，并把每个窗口的风险分数、等级与原文片段共同列出。阅读者可先关注较高分窗口，再回到全文核对论证逻辑、事实依据和个人写作过程。" },
  ],
};

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const isVisualAudit = import.meta.env.DEV && new URLSearchParams(window.location.search).has("visual-audit-report");
  const isLiveAudit = import.meta.env.DEV && new URLSearchParams(window.location.search).has("live-audit-report");
  const isCompactAudit = import.meta.env.DEV && new URLSearchParams(window.location.search).has("compact-upload-audit");
  const [title, setTitle] = useState(() => isVisualAudit ? "报告版式视觉核验样稿" : isLiveAudit || isCompactAudit ? "真实检测结果全链路核验文档" : "未命名文档");
  const [text, setText] = useState(() => isLiveAudit || isCompactAudit ? liveAuditText : "");
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [fileName, setFileName] = useState<string | null>(() => isCompactAudit ? "形势与政策结课论文.pdf" : null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState<ReportData | null>(() => isVisualAudit ? visualAuditReport : isLiveAudit || isCompactAudit ? actualModelAuditReport : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const auditMode = isVisualAudit || isLiveAudit;
  const analyze = trpc.detection.analyze.useMutation({ onSuccess: data => { setReport(data); window.setTimeout(() => document.getElementById("result-summary")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); } });
  const save = trpc.detection.save.useMutation({ onSuccess: data => navigate(`/reports/${data.reportId}`) });
  const processFile = async (file?: File) => {
    if (!file) return;
    setFileError(null);
    const validation = validateFileInput(file.name, file.size);
    if (validation.error || !validation.sourceType) return setFileError(validation.error);
    const kind = validation.sourceType;
    try {
      const extracted = await extractFileText(file, kind);
      const textError = validateTextForAnalysis(extracted, "upload");
      if (textError) return setFileError(textError);
      setText(extracted); setSourceType(kind); setFileName(file.name); setTitle(file.name.replace(/\.[^/.]+$/, "") || "未命名文档"); setReport(null);
    } catch {
      setFileError("文件解析失败。请确认文件未加密、未损坏，并尝试使用文本粘贴方式。");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => processFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files?.[0]); };
  const runAnalysis = () => { setFileError(null); const textError = validateTextForAnalysis(text); if (textError) return setFileError(textError); analyze.mutate({ title: title.trim() || "未命名文档", sourceType, text: text.trim() }); };
  const saveReport = () => { if (!isAuthenticated) return startLogin(); save.mutate({ title: title.trim() || "未命名文档", sourceType, text: text.trim() }); };
  const openReportPreview = () => {
    if (!report) return;
    try {
      sessionStorage.setItem("wenxi-report-preview", JSON.stringify({ title: title.trim() || "未命名文档", report, fileName, createdAt: Date.now() }));
      navigate("/report-preview");
    } catch {
      setFileError("浏览器无法保存本次临时报告，请允许站点使用会话存储后重试。");
    }
  };
  const estimatedSegments = Math.max(1, Math.ceil(text.length / 600));

  return <main className="min-h-screen overflow-x-hidden bg-[#f6f8f5] text-[#26372e]">
    <nav className="sticky top-0 z-20 border-b border-[#e4eae4]/90 bg-[#f6f8f5]/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-7"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#286843] text-white"><ScanSearch size={17} /></span><span className="font-semibold tracking-tight text-[#2a3a31]">文析 <em className="ml-1 not-italic text-xs font-normal text-[#789084]">AIGC 检测</em></span></Link><div className="flex items-center gap-1 sm:gap-3"><Link href="/history" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#5c7064] transition-colors hover:bg-[#eaf1eb] sm:flex"><History size={16} />报告历史</Link>{loading ? <Loader2 className="h-4 w-4 animate-spin text-[#839087]" /> : isAuthenticated ? <span className="max-w-28 truncate text-sm text-[#52675a]">{user?.name || "已登录"}</span> : <Button variant="outline" size="sm" onClick={startLogin} className="border-[#d4dfd5] text-[#456452]">登录保存</Button>}</div></div></nav>

    <section className="relative border-b border-[#e2e9e2] bg-[#f6f8f5]"><div className="hero-grain pointer-events-none absolute inset-0 opacity-50" /><div className="relative mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-7 sm:pb-16 sm:pt-20"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-[#d7e6da] bg-[#edf5ee] px-3 py-1.5 text-xs font-medium text-[#427957]"><Sparkles size={13} />基于语料训练的文本生成特征评估</div><h1 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-[#21342a] sm:text-6xl">理解文本特征，<br /><span className="text-[#3c7b56]">而非给作者下结论。</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-[#63746a] sm:text-lg">导入论文或粘贴正文，系统按段落窗口分析生成文本模式，并以三色报告呈现需要人工复核的区域。</p></div><div className="mt-9 grid max-w-3xl gap-4 sm:grid-cols-3">{[["语料训练", "非词语规则匹配"], ["三色标注", "对应段落风险窗口"], ["隐私优先", "未登录不保存原文"]].map(([a, b]) => <div key={a} className="border-l border-[#cddccf] pl-4"><div className="text-sm font-medium text-[#32453a]">{a}</div><div className="mt-1 text-xs text-[#809086]">{b}</div></div>)}</div></div></section>

    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-7 sm:py-14"><div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-[#dfe8df] bg-white p-5 shadow-[0_10px_30px_rgba(38,58,43,0.04)] sm:p-7"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold tracking-[0.16em] text-[#72877a]">01 / 导入文档</div><h2 className="mt-2 text-xl font-semibold text-[#2b3f33]">上传或粘贴论文正文</h2></div><BookOpenCheck className="h-6 w-6 text-[#74a382]" /></div><input ref={fileRef} type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onFileChange} /><div onDrop={onDrop} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onClick={() => fileRef.current?.click()} className={`mt-6 grid min-h-44 cursor-pointer place-items-center rounded-xl border border-dashed px-5 text-center transition-colors ${dragging ? "border-[#3b8357] bg-[#f0f8f2]" : "border-[#cddacd] bg-[#fbfcfa] hover:border-[#82a98c] hover:bg-[#f7faf7]"}`}><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#eaf3eb] text-[#377c54]"><FileUp size={20} /></span><div className="mt-3 text-sm font-medium text-[#43564a]">拖放文件至此，或点击选择</div><div className="mt-1 text-xs text-[#87958b]">TXT、DOCX、PDF · 最大 10 MB</div></div></div>{fileName && <div className="mt-3 flex items-center justify-between rounded-lg bg-[#eef6f0] px-3 py-2 text-sm text-[#417455]"><span className="truncate">{fileName}</span><button onClick={() => { setFileName(null); setText(""); setSourceType("text"); setReport(null); }} aria-label="移除文件"><X size={16} /></button></div>}<div className="mt-6 border-t border-[#edf0ed] pt-5"><label className="text-xs font-medium text-[#6e7e73]">文档标题</label><Input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 border-[#dae4db] bg-[#fbfcfb]" maxLength={255} /></div></div>
        <div className="rounded-2xl border border-[#dfe8df] bg-white p-5 shadow-[0_10px_30px_rgba(38,58,43,0.04)] sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold tracking-[0.16em] text-[#72877a]">02 / 分析准备</div><h2 className="mt-2 text-xl font-semibold text-[#2b3f33]">确认检测内容</h2></div><span className="rounded-lg bg-[#f1f5f1] px-2.5 py-1 text-xs text-[#718177]">{text.length.toLocaleString()} 字符</span></div>
          {fileName ? <div className="mt-6 rounded-xl border border-[#dce8dd] bg-[#f8fbf8] p-4"><div className="flex items-center gap-2 text-sm font-medium text-[#43594a]"><FileUp size={17} className="text-[#397b55]" />已解析文件，正文不在此页展开</div><p className="mt-2 text-xs leading-5 text-[#748278]">为保持上传页简洁，全文仅用于后台分段检测，不会把长文撑开页面。</p><div className="mt-5 space-y-3">{[["01", "文件解析完成", `${text.length.toLocaleString()} 个字符已准备`], ["02", "按序切分检测窗口", `预计形成 ${estimatedSegments} 个窗口`], ["03", analyze.isPending ? "正在分析窗口" : "等待开始检测", analyze.isPending ? "系统正在顺序聚合风险分" : "开始后仅显示总体摘要"]].map(([index, heading, detail], itemIndex) => <div key={index} className="flex items-start gap-3"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${itemIndex < 2 || analyze.isPending ? "bg-[#e2f0e5] text-[#33714d]" : "bg-[#edf1ed] text-[#87938a]"}`}>{index}</span><div><div className="text-sm font-medium text-[#43564a]">{heading}</div><div className="mt-0.5 text-xs text-[#7e8c82]">{detail}</div></div></div>)}</div></div> : <Textarea value={text} onChange={event => { setText(event.target.value); setSourceType("text"); setFileName(null); setReport(null); }} placeholder="在此粘贴论文正文。系统将自动按语义与长度切分为约600字的检测窗口。" className="mt-6 min-h-64 resize-y border-[#dae4db] bg-[#fbfcfb] p-4 leading-7 placeholder:text-[#a2aea5]" maxLength={70000} />}
          {fileError && <div className="mt-4 flex gap-2 rounded-lg bg-[#fff6ed] px-3 py-3 text-sm leading-5 text-[#a15e25]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{fileError}</div>}
          <Button onClick={runAnalysis} disabled={analyze.isPending} className="mt-5 w-full bg-[#286843] py-6 text-base hover:bg-[#1f5737]">{analyze.isPending ? <><Loader2 className="animate-spin" />正在分析文本特征</> : <>开始检测<ArrowRight size={18} /></>}</Button>
          <div className="mt-4 flex gap-2.5 rounded-lg border border-[#efd4b9] bg-[#fff8ef] px-3 py-3 text-xs leading-5 text-[#89521f]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>已知不适用范围：</strong>约120—280字符的短抒情、生活随笔存在严重漏检；新增冻结AI样本仅1/33达到50分。请勿将本工具用于此类文本的初筛。</p></div><p className="mt-3 text-center text-[11px] leading-5 text-[#8b978e]">检测结果是统计风险评估，不构成作者身份确认或学术诚信处置依据。</p>
        </div>
      </div>
      {analyze.error && <div className="mt-5 rounded-lg border border-[#f0d7ce] bg-[#fff8f6] px-4 py-3 text-sm text-[#a3513b]">检测服务暂时无法完成本次请求：{analyze.error.message}</div>}
      {report && (auditMode ? <div id="report"><ReportPanel report={report} title={title.trim() || "未命名文档"} onSave={saveReport} saving={save.isPending} /></div> : <AnalysisSummary report={report} title={title.trim() || "未命名文档"} fileName={fileName} onOpenReport={openReportPreview} onSave={saveReport} saving={save.isPending} />)}
      {save.error && <p className="mt-3 text-center text-sm text-[#a3513b]">保存失败：{save.error.message}</p>}
    </section>
    <footer className="border-t border-[#e1e8e1] bg-white py-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-5 text-xs text-[#829087] sm:flex-row sm:px-7"><span>文析 AIGC 检测 · 模型版本 iter5-char-2to4gram</span><span>请保留写作过程、参考文献与版本记录作为人工复核依据。</span></div></footer>
  </main>;
}
