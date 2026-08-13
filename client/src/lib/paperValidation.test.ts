import { describe, expect, it } from "vitest";
import { sourceTypeForFileName, validateFileInput, validateTextForAnalysis } from "./paperValidation";

describe("论文导入校验", () => {
  it("仅接受支持的文件类型并识别不区分大小写的扩展名", () => {
    expect(sourceTypeForFileName("paper.DOCX")).toBe("docx");
    expect(sourceTypeForFileName("draft.pdf")).toBe("pdf");
    expect(sourceTypeForFileName("archive.zip")).toBeNull();
  });

  it("拒绝超出大小限制的文件", () => {
    expect(validateFileInput("paper.pdf", 10 * 1024 * 1024 + 1).error).toContain("10 MB");
  });

  it("将空文本、短文本和超长文本映射为明确提示", () => {
    expect(validateTextForAnalysis("")).toContain("至少120");
    expect(validateTextForAnalysis("甲".repeat(119), "upload")).toContain("未能提取");
    expect(validateTextForAnalysis("甲".repeat(70_001))).toContain("70,000");
    expect(validateTextForAnalysis("甲".repeat(120))).toBeNull();
  });
});
