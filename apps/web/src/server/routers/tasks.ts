import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const taskInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.date().optional(),
  projectId: z.string(),
});

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.userId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.task.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(taskInput)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.userId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const lastTask = await ctx.prisma.task.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
      });

      return ctx.prisma.task.create({
        data: { ...input, order: (lastTask?.order ?? -1) + 1 },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(taskInput.omit({ projectId: true }).partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const task = await ctx.prisma.task.findFirst({
        where: { id, project: { userId: ctx.userId } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.task.update({ where: { id }, data });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: { id: input.id, project: { userId: ctx.userId } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: { id: input.id, project: { userId: ctx.userId } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.task.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
