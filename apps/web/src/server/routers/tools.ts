import { router, adminProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAllPlugins, getPlugin, encryptConfig, decryptConfig, getEncryptionKey, executePluginAction } from "@nexus/plugins";



export const toolsRouter = router({
  // List all available plugins with their connection status
  listPlugins: adminProcedure.query(async ({ ctx }) => {
    const plugins = getAllPlugins();
    const connectedTools = await ctx.prisma.tool.findMany({
      where: {
        name: { in: plugins.map((p) => p.name) },
        isActive: true,
      },
    });

    const connectedNames = new Set(connectedTools.map((t) => t.name));

    return plugins.map((p) => ({
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      icon: p.icon,
      category: p.category,
      isConnected: connectedNames.has(p.name),
      configFields: p.getConfigFields().map((f) => ({
        ...f,
        // Never send back sensitive values — just signal presence
      })),
      actions: p.getActions().map((a) => ({
        name: a.name,
        label: a.label,
        description: a.description,
      })),
    }));
  }),

  // Get connected tool (config keys presence only, no values)
  getConnected: adminProcedure
    .input(z.object({ pluginName: z.string() }))
    .query(async ({ ctx, input }) => {
      const tool = await ctx.prisma.tool.findFirst({
        where: { name: input.pluginName, isActive: true },
      });
      if (!tool) return null;

      const plugin = getPlugin(input.pluginName);
      if (!plugin) return null;

      // Return which fields are configured (not the values)
      let configuredKeys: string[] = [];
      try {
        const cfg = decryptConfig(tool.config as string, getEncryptionKey());
        configuredKeys = Object.keys(cfg).filter((k) => Boolean(cfg[k]));
      } catch {
        configuredKeys = [];
      }

      return {
        name: tool.name,
        displayName: tool.displayName,
        isActive: tool.isActive,
        configuredKeys,
        connectedAt: tool.createdAt,
      };
    }),

  // Save (upsert) plugin config — encrypts values before storing
  connect: adminProcedure
    .input(z.object({
      pluginName: z.string(),
      config: z.record(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const plugin = getPlugin(input.pluginName);
      if (!plugin) throw new TRPCError({ code: "NOT_FOUND", message: "Plugin no encontrado" });

      for (const field of plugin.getConfigFields()) {
        if (field.required && !input.config[field.key]?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: `Falta ${field.label}` });
      }
      const encryptedConfig = encryptConfig(input.config, getEncryptionKey());

      await ctx.prisma.tool.upsert({
        where: { name: input.pluginName },
        update: {
          config: encryptedConfig,
          displayName: plugin.displayName,
          description: plugin.description,
          isActive: true,
        },
        create: {
          name: input.pluginName,
          displayName: plugin.displayName,
          description: plugin.description,
          config: encryptedConfig,
          isActive: true,
        },
      });

      return { success: true };
    }),

  // Test plugin connection
  test: adminProcedure
    .input(z.object({ pluginName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plugin = getPlugin(input.pluginName);
      if (!plugin) throw new TRPCError({ code: "NOT_FOUND" });

      const tool = await ctx.prisma.tool.findFirst({
        where: { name: input.pluginName, isActive: true },
      });
      if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: "Plugin no configurado" });

      const config = decryptConfig(tool.config as string, getEncryptionKey());
      return plugin.test(config);
    }),

  // Disconnect a plugin
  disconnect: adminProcedure
    .input(z.object({ pluginName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.tool.updateMany({
        where: { name: input.pluginName },
        data: { isActive: false },
      });
      return { success: true };
    }),

  // Execute a plugin action — used by agents in Fase 4
  execute: adminProcedure
    .input(z.object({
      pluginName: z.string(),
      action: z.string(),
      params: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const plugin = getPlugin(input.pluginName);
      if (!plugin) throw new TRPCError({ code: "NOT_FOUND" });

      const tool = await ctx.prisma.tool.findFirst({
        where: { name: input.pluginName, isActive: true },
      });
      if (!tool) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Plugin no conectado" });
      }

      const config = decryptConfig(tool.config as string, getEncryptionKey());

      try {
        const result = await executePluginAction(plugin, input.action, input.params, config);
        return { success: true, result };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
