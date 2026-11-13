import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

const MAX = 5;

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();
      const uid = ctx.userId;

      const [projects, tasks, agents, apps] = await Promise.all([
        ctx.prisma.project.findMany({
          where: { userId: uid, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
          take: MAX,
          select: { id: true, name: true, description: true, color: true, status: true },
        }),
        ctx.prisma.task.findMany({
          where: { project: { userId: uid }, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
          take: MAX,
          select: { id: true, title: true, status: true, priority: true, projectId: true, project: { select: { name: true } } },
        }),
        ctx.prisma.agent.findMany({
          where: { userId: uid, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
          take: MAX,
          select: { id: true, name: true, description: true, isActive: true, trigger: true },
        }),
        ctx.prisma.app.findMany({
          where: { userId: uid, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
          take: MAX,
          select: { id: true, name: true, description: true, icon: true, url: true, category: true },
        }),
      ]);

      return { projects, tasks, agents, apps };
    }),
});
