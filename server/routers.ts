import { TRPCError } from "@trpc/server";
import { decideIntake } from "./intakeDecisions";
import { assertNoGovernedGenericWrites } from "./_core/approvalPolicy";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { S2C_TABLE_NAMES } from "@shared/s2cSchemaContract";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { runIntakeAssistant, type IntakeChatPayload } from "./intake-llm";
import { applyS2cChanges, getS2cDatabaseMetrics, getS2cSnapshot, resetS2cDemoDatabase } from "./s2cDatabase";
import { AI_PROVIDER_MODES, getAiProviderMode, getAiProviderModeOptions, setAiProviderMode } from "./platform-settings";
import { approveNegotiationTactic, decideResourcingRecommendation, getDynamicResourcing, getNegotiationCockpit, getSapUsers, openNegotiationRound } from "./v5Sourcing";

const s2cTableName = z.enum(S2C_TABLE_NAMES);
const s2cRow = z.record(z.string(), z.unknown());

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  s2c: router({
    snapshot: protectedProcedure.query(async () => getS2cSnapshot()),
    metrics: protectedProcedure.query(async () => getS2cDatabaseMetrics()),
    applyChanges: adminProcedure
      .input(z.object({
        changes: z.array(z.object({
          table: s2cTableName,
          upserts: z.array(s2cRow),
          deletes: z.array(s2cRow),
        })).max(S2C_TABLE_NAMES.length),
      }))
      .mutation(async ({ input }) => {
        try { assertNoGovernedGenericWrites(input.changes); } catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: String(error) }); }
        return applyS2cChanges(input.changes);
      }),
    resetDemo: adminProcedure.mutation(async () => resetS2cDemoDatabase()),
  }),

  intake: router({
    decideApproval: protectedProcedure.input(z.object({ approvalId: z.string().min(1).max(50), decision: z.enum(["APPROVED", "REJECTED"]), comment: z.string().trim().min(1).max(2000) })).mutation(({ ctx, input }) => decideIntake(ctx.user, input.approvalId, input.decision, input.comment)),
    chat: protectedProcedure.input(z.unknown()).mutation(async ({ input }) => runIntakeAssistant(input as IntakeChatPayload)),
  }),

  // Sensitive settings require verified server identity and admin permissions.
  settings: router({
    aiProvider: adminProcedure.query(async () => ({
      mode: await getAiProviderMode(),
      options: getAiProviderModeOptions(),
      foundryConfigured: Boolean(process.env.FOUNDRY_APP_KEY && process.env.FOUNDRY_APP_SECRET),
      builtInConfigured: Boolean(process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY),
    })),
    setAiProvider: adminProcedure
      .input(z.object({ mode: z.enum(AI_PROVIDER_MODES) }))
      .mutation(async ({ input, ctx }) => setAiProviderMode(input.mode, ctx.user.bname)),
  }),

  v5: router({
    sapUsers: protectedProcedure.query(() => getSapUsers()),
    dynamicResourcing: protectedProcedure.input(z.object({ rfxId: z.string().optional() }).optional()).query(({ input }) => getDynamicResourcing(input?.rfxId)),
    negotiation: protectedProcedure.input(z.object({ rfxId: z.string().optional() }).optional()).query(({ input }) => getNegotiationCockpit(input?.rfxId)),
    decideResourcing: adminProcedure
      .input(z.object({ recId: z.string().min(1), status: z.enum(["PENDING_HITL", "APPROVED", "REJECTED", "DEFERRED"]), decidedBy: z.string().max(100).optional() }))
      .mutation(({ input, ctx }) => decideResourcingRecommendation(input.recId, input.status, ctx.user.bname)),
    approveTactic: adminProcedure
      .input(z.object({ caseTacticId: z.string().min(1), approvedBy: z.string().max(100).optional(), status: z.enum(["APPROVED", "REJECTED"]) }))
      .mutation(({ input, ctx }) => approveNegotiationTactic(input.caseTacticId, ctx.user.bname, input.status)),
    openRound: adminProcedure
      .input(z.object({ negotiationCaseId: z.string().min(1), roundType: z.string().min(1).max(50), strategyLabel: z.string().min(1).max(100), responseDueAt: z.string().min(1), createdBy: z.string().max(100).optional() }))
      .mutation(({ input, ctx }) => openNegotiationRound({ ...input, createdBy: ctx.user.bname })),
  }),
});

export type AppRouter = typeof appRouter;
