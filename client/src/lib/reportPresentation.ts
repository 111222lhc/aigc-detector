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
