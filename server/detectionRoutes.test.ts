import { beforeEach, describe, expect, it, vi } from "vitest";

const persistence = vi.hoisted(() => ({
  saveReportForUser: vi.fn(),
  listReportsForUser: vi.fn(),
  getReportForUser: vi.fn(),
}));

vi.mock("./reportData", () => persistence);

import { appRouter } from "./routers";

const input = { title: "路由测试文档", sourceType: "text" as const, text: "这是用于验证报告路由保存、读取与用户隔离参数的测试文本。".repeat(8) };

function callerFor(userId = 42) {
  return appRouter.createCaller({
    user: { id: userId, openId: `user-${userId}`, name: "测试用户", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });
}

describe("detection report routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a newly analyzed report under the current user", async () => {
    persistence.saveReportForUser.mockResolvedValue(17);
    const result = await callerFor().detection.save(input);
    expect(result.reportId).toBe(17);
    expect(result.report.charCount).toBeGreaterThanOrEqual(120);
    expect(persistence.saveReportForUser).toHaveBeenCalledWith(42, input.title, "text", expect.objectContaining({ modelVersion: expect.any(String) }));
  });

  it("passes the current user identifier to report history and detail queries", async () => {
    persistence.listReportsForUser.mockResolvedValue([{ id: 9, title: "历史报告" }]);
    persistence.getReportForUser.mockResolvedValue({ id: 9, title: "历史报告", distribution: { low: 1, medium: 0, high: 0 }, segments: [] });
    const caller = callerFor(84);
    await expect(caller.detection.list()).resolves.toEqual([{ id: 9, title: "历史报告" }]);
    await expect(caller.detection.get({ id: 9 })).resolves.toMatchObject({ id: 9 });
    expect(persistence.listReportsForUser).toHaveBeenCalledWith(84);
    expect(persistence.getReportForUser).toHaveBeenCalledWith(84, 9);
  });
});
