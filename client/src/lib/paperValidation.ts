export type SourceType = "text" | "txt" | "docx" | "pdf";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 70_000;
const MIN_TEXT_LENGTH = 120;

export function sourceTypeForFileName(fileName: string): Exclude<SourceType, "text"> | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".txt")) return "txt";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  return null;
}

export function validateFileInput(fileName: string, size: number): { sourceType: Exclude<SourceType, "text"> | null; error: string | null } {
  const sourceType = sourceTypeForFileName(fileName);
  if (!sourceType) return { sourceType: null, error: "仅支持 TXT、DOCX 与 PDF 格式。请转换后重试。" };
  if (size > MAX_FILE_SIZE) return { sourceType, error: "单个文件不能超过 10 MB。建议移除扫描图片后再上传。" };
  return { sourceType, error: null };
}

export function validateTextForAnalysis(text: string, context: "upload" | "analysis" = "analysis"): string | null {
  if (text.trim().length < MIN_TEXT_LENGTH) return context === "upload" ? "未能提取足够正文。扫描版PDF请先完成OCR，或直接粘贴文本。" : "请先输入或导入至少120个字符的正文。";
  if (text.length > MAX_TEXT_LENGTH) return "正文超过 70,000 字符。请按章节拆分后检测。";
  return null;
}
