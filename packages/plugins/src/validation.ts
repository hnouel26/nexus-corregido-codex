import type { Plugin } from './types';

export function validatePluginInput(plugin: Plugin, action: string, params: unknown): unknown {
  const definition = plugin.getActions().find((item) => item.name === action);
  if (!definition) throw new Error(`Acción desconocida: ${action}`);
  return definition.inputSchema.parse(params);
}

export async function executePluginAction(plugin: Plugin, action: string, params: unknown, config: Record<string, string>) {
  // Los plugins nuevos tienen executeAction directo, los viejos tienen execute
  if ('executeAction' in plugin) {
    return (plugin as any).executeAction(action, params, config);
  }
  return plugin.execute(action, validatePluginInput(plugin, action, params), config);
}
