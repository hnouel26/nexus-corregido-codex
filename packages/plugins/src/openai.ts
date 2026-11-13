import { validatePluginInput } from "./validation";
import { fetchJson } from "./http";
import OpenAI from "openai";
import { z } from "zod";
import type { Plugin, PluginConfigField, PluginAction, TestResult, ClaudeTool } from "./types";

export class OpenAIPlugin implements Plugin {
  readonly name = "openai";
  readonly displayName = "OpenAI";
  readonly description = "OpenAI GPT — modelo de lenguaje para agentes y completions";
  readonly icon = "🤖";
  readonly category = "AI";

  getConfigFields(): PluginConfigField[] {
    return [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "sk-...",
        required: true,
        hint: "Obtén tu clave en platform.openai.com/api-keys",
      },
      {
        key: "defaultModel",
        label: "Modelo por defecto",
        type: "text",
        placeholder: "gpt-4o",
        required: false,
        hint: "gpt-4o | gpt-4o-mini | gpt-4-turbo",
      },
    ];
  }

  getActions(): PluginAction[] {
    return [
      {
        name: "complete",
        label: "Completion",
        description: "Envía un mensaje y recibe una respuesta del modelo",
        inputSchema: z.object({
          prompt: z.string().min(1),
          model: z.string().optional(),
          maxTokens: z.number().int().min(1).max(16384).default(1024),
          systemPrompt: z.string().optional(),
        }),
      },
    ];
  }

  async test(config: Record<string, string>): Promise<TestResult> {
    if (!config.apiKey) return { ok: false, message: "API Key requerida" };
    try {
      const client = new OpenAI({ apiKey: config.apiKey });
      const res = await client.chat.completions.create({
        model: config.defaultModel ?? "gpt-4o-mini",
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }],
      });
      return { ok: true, message: `Conexión exitosa — modelo: ${res.model}` };
    } catch (err) {
      return { ok: false, message: "Error de conexión", detail: String(err) };
    }
  }

  async execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown> {
    const client = new OpenAI({ apiKey: config.apiKey });
    const p = validatePluginInput(this, action, params) as { prompt: string; model?: string; maxTokens?: number; systemPrompt?: string };

    if (action === "complete") {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      if (p.systemPrompt) messages.push({ role: "system", content: p.systemPrompt });
      messages.push({ role: "user", content: p.prompt });

      const res = await client.chat.completions.create({
        model: p.model ?? config.defaultModel ?? "gpt-4o",
        max_tokens: p.maxTokens ?? 1024,
        messages,
      });
      return {
        text: res.choices[0].message.content ?? "",
        model: res.model,
        usage: res.usage,
        stopReason: res.choices[0].finish_reason,
      };
    }

    throw new Error(`Acción desconocida: ${action}`);
  }

  toClaudeTools(): ClaudeTool[] {
    return [];
  }
}
