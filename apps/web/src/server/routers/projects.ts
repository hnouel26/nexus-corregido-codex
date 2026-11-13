import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const projectInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0085D5"),
});

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      where: { userId: ctx.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          tasks: { orderBy: [{ status: "asc" }, { order: "asc" }] },
          _count: { select: { tasks: true } },
        },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  create: protectedProcedure
    .input(projectInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(projectInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.project.findFirst({
        where: { id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.project.update({ where: { id }, data });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.project.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.project.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
