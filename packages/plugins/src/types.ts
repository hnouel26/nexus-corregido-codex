import { z } from "zod";

export interface PluginConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea";
  placeholder?: string;
  required: boolean;
  hint?: string;
}

export interface PluginAction {
  name: string;
  label: string;
  description: string;
  inputSchema: z.ZodSchema;
}

export interface TestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

// Claude API tool definition format
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface Plugin {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly category: string;
  getConfigFields(): PluginConfigField[];
  test(config: Record<string, string>): Promise<TestResult>;
  execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown>;
  getActions(): PluginAction[];
  // Tool definitions exposed to Claude agents
  // Naming convention: {pluginName}__{actionName}
  toClaudeTools(): ClaudeTool[];
}
