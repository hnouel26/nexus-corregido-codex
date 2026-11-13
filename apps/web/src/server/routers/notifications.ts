import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.notification.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: { userId: ctx.userId, isRead: false },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRead: true },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: { userId: ctx.userId, isRead: false },
      data: { isRead: true },
    });
  }),

  // Usado internamente por agentes y apps para emitir notificaciones
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      message: z.string().max(1000).optional(),
      type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).default("INFO"),
      link: z.string().optional(),
      sourceType: z.string().optional(),
      sourceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
      return { success: true };
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.deleteMany({
      where: { userId: ctx.userId, isRead: true },
    });
    return { success: true };
  }),
});
