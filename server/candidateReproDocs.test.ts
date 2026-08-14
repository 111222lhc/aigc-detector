import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("candidate-model public reproducibility package", () => {
  it("keeps the public reproduction documents linked from the repository entrypoint", () => {
    const readme = read("README.md");
    expect(readme).toContain("docs/CANDIDATE_MODEL_REPRODUCIBILITY.md");
    expect(readme).toContain("docs/LOCAL_FINE_TUNE_RUNBOOK.md");
    expect(readme).toContain("docs/LOCAL_MODEL_OPERATOR_GUIDE.md");
    expect(read("docs/CANDIDATE_MODEL_REPRODUCIBILITY.md")).toContain("不公开的内容");
  });

  it("preserves only-local service operation and an explicit production gate", () => {
    const guide = read("docs/LOCAL_MODEL_OPERATOR_GUIDE.md");
    const serverSource = read("scripts/local-onnx-inference-server.mjs");
    expect(guide).toContain("127.0.0.1");
    expect(guide).toContain("V2 跨文体、跨生成器冻结盲测");
    expect(serverSource).toContain("127.0.0.1");
    expect(serverSource).toContain("x-aigc-api-key");
  });

  it("prevents model artifacts and local credentials from entering the public repository", () => {
    const ignore = read(".gitignore");
    for (const entry of ["*.onnx", "*.onnx.data", "*.safetensors", "local_service.env", "private-data/"]) {
      expect(ignore).toContain(entry);
    }
  });
});
