import { iter5CharModel } from "./models/iter5CharModel";

export type RiskLevel = "low" | "medium" | "high";

export type DetectionSegmentResult = {
  position: number;
  content: string;
  score: number;
  riskLevel: RiskLevel;
  charCount: number;
};

export type DetectionReportResult = {
  overallScore: number;
  riskLevel: RiskLevel;
  charCount: number;
  segmentCount: number;
  modelVersion: string;
  distribution: Record<RiskLevel, number>;
  segments: DetectionSegmentResult[];
};

const rawWeights = Buffer.from(iter5CharModel.weightsBase64, "base64");
const weights = new Float32Array(rawWeights.buffer, rawWeights.byteOffset, rawWeights.byteLength / Float32Array.BYTES_PER_ELEMENT);

function murmurHash3Utf8(input: string, seed = 0): number {
  const bytes = Buffer.from(input, "utf8");
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let h1 = seed >>> 0;
  let i = 0;
  for (; i + 4 <= bytes.length; i += 4) {
    let k1 = (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0;
    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;
    h1 ^= k1;
    h1 = (((h1 << 13) | (h1 >>> 19)) >>> 0);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }
  let tail = 0;
  if (bytes.length - i === 3) tail ^= bytes[i + 2] << 16;
  if (bytes.length - i >= 2) tail ^= bytes[i + 1] << 8;
  if (bytes.length - i >= 1) {
    tail ^= bytes[i];
    tail = Math.imul(tail, c1) >>> 0;
    tail = ((tail << 15) | (tail >>> 17)) >>> 0;
    tail = Math.imul(tail, c2) >>> 0;
    h1 ^= tail;
  }
  h1 ^= bytes.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35) >>> 0;
  h1 ^= h1 >>> 16;
  return h1 | 0;
}

function featureIndex(ngram: string): number {
  const hash = murmurHash3Utf8(ngram);
  // sklearn FeatureHasher uses abs(signed_hash) modulo n_features when alternate_sign=False.
  return Math.abs(hash) % iter5CharModel.nFeatures;
}

export function scoreTextWindow(text: string): number {
  const counts = new Map<number, number>();
  for (let n = iter5CharModel.ngramMin; n <= iter5CharModel.ngramMax; n += 1) {
    for (let start = 0; start + n <= text.length; start += 1) {
      const idx = featureIndex(text.slice(start, start + n));
      counts.set(idx, (counts.get(idx) ?? 0) + 1);
    }
  }
  let normSquared = 0;
  for (const value of Array.from(counts.values())) normSquared += value * value;
  const norm = Math.sqrt(normSquared) || 1;
  let logit = iter5CharModel.intercept;
  for (const [idx, count] of Array.from(counts.entries())) logit += weights[idx] * (count / norm);
  const probability = 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, logit))));
  return Math.round(probability * 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function splitIntoWindows(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/[\t ]+/g, " ").trim();
  const sourceBlocks = normalized.split(/\n{2,}/).flatMap(block => block.split(/(?<=[。！？；!?;])/));
  const windows: string[] = [];
  let buffer = "";
  for (const rawBlock of sourceBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;
    if (buffer.length && buffer.length + block.length > 600) {
      windows.push(buffer);
      buffer = "";
    }
    let remaining = block;
    while (remaining.length > 600) {
      windows.push(remaining.slice(0, 600));
      remaining = remaining.slice(600);
    }
    if (remaining.length) buffer += remaining;
  }
  if (buffer) windows.push(buffer);
  const merged: string[] = [];
  for (const window of windows) {
    if (window.length < 80 && merged.length) merged[merged.length - 1] += window;
    else merged.push(window);
  }
  return merged.filter(item => item.length >= 20);
}

export function analyzeText(text: string): DetectionReportResult {
  const cleanText = text.replace(/\u0000/g, "").trim();
  if (cleanText.length < 120) throw new Error("检测文本至少需要120个字符。");
  const windows = splitIntoWindows(cleanText);
  const segments = windows.map((content, index) => {
    const score = scoreTextWindow(content);
    return { position: index + 1, content, score, riskLevel: getRiskLevel(score), charCount: content.length };
  });
  const charCount = segments.reduce((sum, item) => sum + item.charCount, 0);
  const overallScore = Math.round(segments.reduce((sum, item) => sum + item.score * item.charCount, 0) / Math.max(charCount, 1));
  const distribution: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const segment of segments) distribution[segment.riskLevel] += 1;
  return { overallScore, riskLevel: getRiskLevel(overallScore), charCount, segmentCount: segments.length, modelVersion: iter5CharModel.version, distribution, segments };
}
