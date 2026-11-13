import { OpenAIPlugin } from "./openai";
import { SnowflakePlugin } from "./snowflake";
import { ClickUpPlugin } from "./clickup";
import { MakePlugin } from "./make";
import { KaibarixCompliancePlugin } from "./kaibarix-compliance";
import type { Plugin } from "./types";

export type { Plugin, PluginConfigField, PluginAction, TestResult, ClaudeTool } from "./types";
export { encryptConfig, decryptConfig, getEncryptionKey } from "./encrypt";

export const PLUGINS: Record<string, Plugin> = {
  openai: new OpenAIPlugin(),
  snowflake: new SnowflakePlugin(),
  clickup: new ClickUpPlugin(),
  make: new MakePlugin(),
  kaibarix_compliance: new KaibarixCompliancePlugin(),
};

export function getPlugin(name: string): Plugin | undefined {
  return PLUGINS[name];
}

export function getAllPlugins(): Plugin[] {
  return Object.values(PLUGINS);
}

export { executePluginAction } from "./validation";
