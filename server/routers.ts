import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { analyzeText } from "./detectionEngine";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getReportForUser, listReportsForUser, saveReportForUser } from "./reportData";

const analysisInput = z.object({
  title: z.string().trim().min(1).max(255),
  sourceType: z.enum(["text", "txt", "docx", "pdf"]),
  text: z.string().trim().min(120).max(70000),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  detection: router({
    analyze: publicProcedure.input(analysisInput).mutation(({ input }) => analyzeText(input.text)),
    save: protectedProcedure.input(analysisInput).mutation(async ({ ctx, input }) => {
      const report = analyzeText(input.text);
      const reportId = await saveReportForUser(ctx.user.id, input.title, input.sourceType, report);
      return { reportId, report };
    }),
    list: protectedProcedure.query(({ ctx }) => listReportsForUser(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getReportForUser(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
