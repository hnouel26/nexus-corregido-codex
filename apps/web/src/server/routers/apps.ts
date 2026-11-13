import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const APP_CATEGORIES = ["DASHBOARD", "TOOL", "DATABASE", "INTEGRATION", "INTERNAL", "EXTERNAL"] as const;

const appInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url("URL inválida").refine((url) => ["http:", "https:"].includes(new URL(url).protocol), "Usa http o https"),
  icon: z.string().max(10).default("🔧"),
  category: z.enum(APP_CATEGORIES).default("TOOL"),
  healthUrl: z.string().url().refine((url) => ["http:", "https:"].includes(new URL(url).protocol), "Usa http o https").optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0085D5"),
  isPinned: z.boolean().default(false),
});

export const appsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.app.findMany({
      where: { userId: ctx.userId, isActive: true },
      orderBy: [{ isPinned: "desc" }, { order: "asc" }, { name: "asc" }],
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      return app;
    }),

  create: protectedProcedure
    .input(appInput)
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.prisma.app.count({ where: { userId: ctx.userId } });
      return ctx.prisma.app.create({
        data: {
          ...input,
          healthUrl: input.healthUrl || null,
          userId: ctx.userId,
          order: count,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(appInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.app.findFirst({
        where: { id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.app.update({
        where: { id },
        data: { ...data, healthUrl: data.healthUrl === "" ? null : data.healthUrl },
      });
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.app.update({
        where: { id: input.id },
        data: { isPinned: !app.isPinned },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.app.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.app.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Ping de salud — llamado desde el cliente para verificar estado
  checkHealth: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (!app.healthUrl) return { isHealthy: null };

      try {
        const res = await fetch(app.healthUrl, {
          signal: AbortSignal.timeout(5000),
        });
        const isHealthy = res.ok;
        await ctx.prisma.app.update({
          where: { id: input.id },
          data: { isHealthy, lastHealthAt: new Date() },
        });
        return { isHealthy };
      } catch {
        await ctx.prisma.app.update({
          where: { id: input.id },
          data: { isHealthy: false, lastHealthAt: new Date() },
        });
        return { isHealthy: false };
      }
    }),
});
