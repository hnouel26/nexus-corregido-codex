import { validatePluginInput } from "./validation";
import { fetchJson } from "./http";
import { z } from "zod";
import type { Plugin, PluginConfigField, PluginAction, TestResult, ClaudeTool } from "./types";

const BASE = "https://api.clickup.com/api/v2";

export class ClickUpPlugin implements Plugin {
  readonly name = "clickup";
  readonly displayName = "ClickUp";
  readonly description = "Gestión de tareas NFI — crea, actualiza y consulta tareas desde agentes";
  readonly icon = "✅";
  readonly category = "Integration";

  getConfigFields(): PluginConfigField[] {
    return [
      {
        key: "apiKey",
        label: "API Key personal",
        type: "password",
        placeholder: "pk_...",
        required: true,
        hint: "ClickUp → Settings → Apps → API Token",
      },
      {
        key: "defaultListId",
        label: "List ID por defecto",
        type: "text",
        placeholder: "901234567",
        required: false,
        hint: "ID de la lista donde se crearán las tareas por defecto",
      },
      {
        key: "workspaceId",
        label: "Workspace (Team) ID",
        type: "text",
        placeholder: "12345678",
        required: false,
        hint: "ID del workspace — opcional para filtrar búsquedas",
      },
    ];
  }

  private headers(apiKey: string) {
    return { Authorization: apiKey, "Content-Type": "application/json" };
  }

  async test(config: Record<string, string>): Promise<TestResult> {
    if (!config.apiKey) return { ok: false, message: "API Key requerida" };
    try {
      const res = await fetchJson(`${BASE}/user`, {
        headers: this.headers(config.apiKey),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, message: `Error ${res.status}`, detail: await res.text() };
      const data = await res.json() as { user: { username: string; email: string } };
      return { ok: true, message: `Conectado como ${data.user.username} (${data.user.email})` };
    } catch (err) {
      return { ok: false, message: "Error de conexión", detail: String(err) };
    }
  }

  getActions(): PluginAction[] {
    return [
      { name: "create_task",     label: "Crear tarea",          description: "Crea una tarea en una lista", inputSchema: z.object({ listId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/).optional(), name: z.string().min(1), description: z.string().optional(), priority: z.number().int().min(1).max(4).optional() }) },
      { name: "get_tasks",       label: "Obtener tareas",        description: "Lista tareas de una lista",   inputSchema: z.object({ listId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/).optional(), status: z.string().optional() }) },
      { name: "update_task",     label: "Actualizar tarea",      description: "Actualiza nombre, status o descripción", inputSchema: z.object({ taskId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/), name: z.string().optional(), status: z.string().optional(), description: z.string().optional() }) },
      { name: "create_comment",  label: "Comentar tarea",        description: "Agrega un comentario",        inputSchema: z.object({ taskId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/), comment: z.string() }) },
      { name: "search_tasks",    label: "Buscar tareas",         description: "Busca tareas por texto",      inputSchema: z.object({ query: z.string(), teamId: z.string().optional() }) },
    ];
  }

  async execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown> {
    const p = validatePluginInput(this, action, params) as Record<string, unknown>;
    const h = this.headers(config.apiKey);
    if ((action === "create_task" || action === "get_tasks") && !p.listId && !config.defaultListId) throw new Error("List ID requerido");

    if (action === "create_task") {
      const res = await fetchJson(`${BASE}/list/${p.listId ?? config.defaultListId}/task`, {
        method: "POST", headers: h,
        body: JSON.stringify({ name: p.name, description: p.description, priority: p.priority }),
      });
      return res.json();
    }

    if (action === "get_tasks") {
      const url = new URL(`${BASE}/list/${p.listId ?? config.defaultListId}/task`);
      if (p.status) url.searchParams.set("statuses[]", String(p.status));
      const res = await fetchJson(url, { headers: h });
      const data = await res.json() as { tasks: unknown[] };
      return data.tasks ?? [];
    }

    if (action === "update_task") {
      const res = await fetchJson(`${BASE}/task/${p.taskId}`, {
        method: "PUT", headers: h,
        body: JSON.stringify({ name: p.name, status: p.status, description: p.description }),
      });
      return res.json();
    }

    if (action === "create_comment") {
      const res = await fetchJson(`${BASE}/task/${p.taskId}/comment`, {
        method: "POST", headers: h,
        body: JSON.stringify({ comment_text: p.comment }),
      });
      return res.json();
    }

    if (action === "search_tasks") {
      const teamId = p.teamId ?? config.workspaceId;
      if (!teamId) throw new Error("Workspace ID requerido para buscar tareas");
      const res = await fetchJson(`${BASE}/team/${teamId}/task?query=${encodeURIComponent(String(p.query))}`, { headers: h });
      const data = await res.json() as { tasks: unknown[] };
      return data.tasks ?? [];
    }

    throw new Error(`Acción desconocida: ${action}`);
  }

  toClaudeTools(): ClaudeTool[] {
    return [
      {
        name: "clickup__create_task",
        description: "Create a task in ClickUp. Use when the user wants to log work, create a follow-up, or track something in ClickUp.",
        input_schema: {
          type: "object",
          properties: {
            name:        { type: "string",  description: "Task name" },
            description: { type: "string",  description: "Task description (markdown supported)" },
            listId:      { type: "string",  description: "ClickUp list ID — omit to use default list" },
            priority:    { type: "number",  description: "Priority: 1=urgent, 2=high, 3=normal, 4=low" },
          },
          required: ["name"],
        },
      },
      {
        name: "clickup__get_tasks",
        description: "Get tasks from a ClickUp list. Use to check existing tasks before creating duplicates.",
        input_schema: {
          type: "object",
          properties: {
            listId: { type: "string", description: "ClickUp list ID — omit to use default list" },
            status: { type: "string", description: "Filter by status (optional)" },
          },
          required: [],
        },
      },
      {
        name: "clickup__update_task",
        description: "Update an existing ClickUp task's name, status, or description.",
        input_schema: {
          type: "object",
          properties: {
            taskId:      { type: "string", description: "Task ID to update" },
            name:        { type: "string", description: "New name (optional)" },
            status:      { type: "string", description: "New status (optional)" },
            description: { type: "string", description: "New description (optional)" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "clickup__create_comment",
        description: "Add a comment to a ClickUp task. Use to document findings or results.",
        input_schema: {
          type: "object",
          properties: {
            taskId:  { type: "string", description: "Task ID" },
            comment: { type: "string", description: "Comment text" },
          },
          required: ["taskId", "comment"],
        },
      },
    ];
  }
}
