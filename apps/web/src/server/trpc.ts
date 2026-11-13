import { initTRPC, TRPCError } from "@trpc/server";

import { prisma } from "@/lib/db";
import superjson from "superjson";

export const createTRPCContext = async () => {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  return { session, prisma };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id },
  });
});

// Integrations are intentionally global in the existing schema. Do not let
// ordinary accounts change or spend the shared service credentials.
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({ where: { id: ctx.userId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Se requiere administrador para agentes e integraciones compartidas" });
  return next({ ctx });
});
