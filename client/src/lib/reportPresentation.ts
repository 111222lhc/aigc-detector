export type RiskLevel = "low" | "medium" | "high";

export const RISK_META = {
  high: { label: "高风险", color: "#c94545", soft: "#fff0ef", text: "检测到较多生成文本特征" },
  medium: { label: "中风险", color: "#cf7a2a", soft: "#fff7ed", text: "存在一定生成文本特征" },
  low: { label: "低风险", color: "#3c8a61", soft: "#edf8f1", text: "未见明显生成文本特征" },
} as const;

export function getDistributionRows(distribution: Record<RiskLevel, number>) {
  return (["low", "medium", "high"] as const).map(level => ({ name: RISK_META[level].label, value: distribution[level], fill: RISK_META[level].color }));
}

export function getReviewSegments<T extends { score: number }>(segments: T[]) {
  return [...segments].sort((a, b) => b.score - a.score).filter(segment => segment.score >= 30).slice(0, 5);
}

export function getReportConclusion(riskLevel: RiskLevel) {
  const conclusions = {
    high: {
      heading: "建议优先人工复核",
      detail: "文本中存在多个高风险窗口。请回看写作过程、引用来源、版本记录与原始材料，不宜仅凭本报告作出作者身份或学术诚信判断。",
    },
    medium: {
      heading: "建议结合上下文复核",
      detail: "部分窗口呈现生成文本特征。建议重点检查橙色、红色窗口，并结合章节功能、引文和写作过程进行判断。",
    },
    low: {
      heading: "当前窗口未见明显生成特征",
      detail: "该结果只反映当前模型和文本范围内的风险信号，不等同于确认人类写作。仍建议保留写作过程与版本记录作为复核依据。",
    },
  } as const;
  return conclusions[riskLevel];
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function shortHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36).toUpperCase().padStart(5, "0").slice(-5);
}

export function createReportCode(title: string, overallScore: number, charCount: number, issuedAt: Date) {
  const datePart = `${issuedAt.getFullYear()}${pad(issuedAt.getMonth() + 1)}${pad(issuedAt.getDate())}`;
  return `WX-${datePart}-${shortHash(`${title}|${overallScore}|${charCount}`)}`;
}

function quoteCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function buildSegmentsCsv<T extends { position: number; content: string; score: number; riskLevel: RiskLevel; charCount: number }>(title: string, reportCode: string, segments: T[]) {
  const rows: Array<Array<string | number>> = [
    ["文析 AIGC 文本特征评估报告｜窗口明细"],
    ["报告编号", reportCode],
    ["文档标题", title],
    [],
    ["窗口序号", "风险分", "等级", "字符数", "原文片段"],
    ...segments.map(segment => [segment.position, segment.score, RISK_META[segment.riskLevel].label, segment.charCount, segment.content]),
  ];
  return `\uFEFF${rows.map(row => row.map(quoteCsv).join(",")).join("\r\n")}`;
}
