import { router, adminProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { enqueueRun } from "@/lib/enqueue";
import { isValidCron } from "@/lib/cron";

const agentInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(20000),
  model: z.string().min(1).max(100).refine((model) => !model.startsWith("claude-"), "El ejecutor actual requiere un modelo de OpenAI").default("gpt-4o"),
  trigger: z.enum(["MANUAL", "SCHEDULE", "WEBHOOK"]).default("MANUAL"),
  cronExpr: z.string().max(100).optional(),
  toolIds: z.array(z.string()).max(20).default([]),
});

export const agentsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agent.findMany({
      where: { userId: ctx.userId },
      include: {
        _count: { select: { runs: true } },
        runs: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { status: true, createdAt: true, id: true },
        },
        agentTools: { include: { tool: { select: { name: true, displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          agentTools: { include: { tool: { select: { id: true, name: true, displayName: true, isActive: true } } } },
          runs: {
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              id: true, status: true, input: true, output: true,
              startedAt: true, endedAt: true, createdAt: true,
            },
          },
        },
      });
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return agent;
    }),

  create: adminProcedure
    .input(agentInput)
    .mutation(async ({ ctx, input }) => {
      const { toolIds, ...data } = input;
      if (data.trigger === "SCHEDULE" && (!data.cronExpr || !isValidCron(data.cronExpr))) throw new TRPCError({ code: "BAD_REQUEST", message: "Calendario inválido" });

      // toolIds can be plugin names OR DB tool IDs — resolve to DB IDs
      const tools = toolIds.length
        ? await ctx.prisma.tool.findMany({
            where: { OR: [{ id: { in: toolIds } }, { name: { in: toolIds } }], isActive: true },
          })
        : [];

      const agent = await ctx.prisma.agent.create({
        data: {
          ...data,
          userId: ctx.userId,
          agentTools: {
            create: tools.map((t) => ({ toolId: t.id })),
          },
        },
        include: { agentTools: true },
      });
      return agent;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(agentInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, toolIds, ...data } = input;
      const existing = await ctx.prisma.agent.findFirst({
        where: { id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const trigger = data.trigger ?? existing.trigger;
      const cronExpr = data.cronExpr ?? existing.cronExpr;
      if (trigger === "SCHEDULE" && (!cronExpr || !isValidCron(cronExpr))) throw new TRPCError({ code: "BAD_REQUEST", message: "Calendario inválido" });
      const tools = toolIds === undefined ? undefined : await ctx.prisma.tool.findMany({
        where: { OR: [{ id: { in: toolIds } }, { name: { in: toolIds } }], isActive: true },
        select: { id: true },
      });
      return ctx.prisma.agent.update({ where: { id }, data: {
        ...data,
        ...(tools === undefined ? {} : { agentTools: { deleteMany: {}, create: tools.map((tool) => ({ toolId: tool.id })) } }),
      } });
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.agent.update({
        where: { id: input.id },
        data: { isActive: !agent.isActive },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.agent.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.agent.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Trigger a manual run
  run: adminProcedure
    .input(z.object({ id: z.string(), input: z.string().max(50000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      if (!agent.isActive) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Agente inactivo" });

      return enqueueRun(agent.id, input.input ?? null);
    }),

  getRun: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.prisma.agentRun.findFirst({
        where: { id: input.id, agent: { userId: ctx.userId } },
        include: { agent: { select: { name: true, model: true } } },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      return run;
    }),

  cancelRun: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.agentRun.findFirst({
        where: { id: input.id, agent: { userId: ctx.userId } },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.agentRun.updateMany({
        where: { id: input.id, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      return ctx.prisma.agentRun.findUniqueOrThrow({ where: { id: input.id } });
    }),
});
