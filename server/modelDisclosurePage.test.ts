import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public model disclosure", () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/ModelDisclosure.tsx"), "utf8");
  const app = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");

  it("states the current model and the direct locked-blind comparison", () => {
    expect(page).toContain("当前使用 Iter5");
    expect(page).toContain("同一锁定盲测的直接比较");
    expect(page).toContain("总体准确率");
    expect(page).toContain("96.00%");
    expect(page).toContain("69.00%");
  });

  it("does not present the candidate as already deployed", () => {
    expect(page).toContain("为什么当前没有直接替换");
    expect(page).toContain("零退化风险门槛");
    expect(page).toContain("新的、跨文体与跨生成器盲测集");
  });

  it("registers stable public routes for the disclosure page", () => {
    expect(app).toContain('path={"/model-info"} component={ModelDisclosure}');
    expect(app).toContain('path={"/model-disclosure"} component={ModelDisclosure}');
  });
});
