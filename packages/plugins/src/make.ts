import { validatePluginInput } from "./validation";
import { fetchJson } from "./http";
import { z } from "zod";
import type { Plugin, PluginConfigField, PluginAction, TestResult, ClaudeTool } from "./types";

const REGIONS: Record<string, string> = {
  eu2: "https://eu2.make.com/api/v2",
  us1: "https://us1.make.com/api/v2",
  us2: "https://us2.make.com/api/v2",
};

export class MakePlugin implements Plugin {
  readonly name = "make";
  readonly displayName = "Make";
  readonly description = "Automatizaciones — ejecuta escenarios de Make.com desde agentes";
  readonly icon = "⚙️";
  readonly category = "Integration";

  getConfigFields(): PluginConfigField[] {
    return [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "tu API key de Make",
        required: true,
        hint: "Make → Profile → API access → Add token",
      },
      {
        key: "region",
        label: "Región",
        type: "text",
        placeholder: "eu2",
        required: true,
        hint: "eu2 (Europa) · us1 · us2 (EEUU). Ve a tu URL de Make para identificarla.",
      },
      {
        key: "teamId",
        label: "Team ID",
        type: "text",
        placeholder: "123456",
        required: true,
        hint: "ID numérico de tu equipo/organización en Make",
      },
    ];
  }

  private base(config: Record<string, string>): string {
    const url = REGIONS[config.region];
    if (!url) throw new Error("Región de Make inválida");
    return url;
  }

  private headers(apiKey: string) {
    return { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" };
  }

  async test(config: Record<string, string>): Promise<TestResult> {
    if (!config.apiKey || !config.teamId) return { ok: false, message: "API Key y Team ID requeridos" };
    try {
      const res = await fetchJson(`${this.base(config)}/users/me`, {
        headers: this.headers(config.apiKey),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, message: `Error ${res.status}`, detail: await res.text() };
      const data = await res.json() as { user: { name: string; email: string } };
      return { ok: true, message: `Conectado como ${data.user?.name ?? data.user?.email ?? "Usuario"}` };
    } catch (err) {
      return { ok: false, message: "Error de conexión", detail: String(err) };
    }
  }

  getActions(): PluginAction[] {
    return [
      { name: "list_scenarios", label: "Listar escenarios",  description: "Obtiene lista de escenarios disponibles", inputSchema: z.object({ teamId: z.string().optional() }) },
      { name: "run_scenario",   label: "Ejecutar escenario", description: "Dispara la ejecución de un escenario",    inputSchema: z.object({ scenarioId: z.number().int().positive() }) },
      { name: "get_executions", label: "Ver ejecuciones",    description: "Obtiene historial de ejecuciones",        inputSchema: z.object({ scenarioId: z.number().int(), limit: z.number().int().min(1).max(100).default(10) }) },
    ];
  }

  async execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown> {
    const p = validatePluginInput(this, action, params) as Record<string, unknown>;
    const h = this.headers(config.apiKey);
    const base = this.base(config);
    const teamId = p.teamId ?? config.teamId;

    if (action === "list_scenarios") {
      const res = await fetchJson(`${base}/scenarios?teamId=${teamId}`, { headers: h });
      const data = await res.json() as { scenarios: Array<{ id: number; name: string; isActive: boolean }> };
      return (data.scenarios ?? []).map((s) => ({ id: s.id, name: s.name, active: s.isActive }));
    }

    if (action === "run_scenario") {
      const res = await fetchJson(`${base}/scenarios/${p.scenarioId}/run`, {
        method: "POST", headers: h,
        body: JSON.stringify({ responsive: false }),
      });
      return res.json();
    }

    if (action === "get_executions") {
      const res = await fetchJson(`${base}/scenarios/${p.scenarioId}/executions?teamId=${teamId}&pg[limit]=${p.limit ?? 10}`, { headers: h });
      return res.json();
    }

    throw new Error(`Acción desconocida: ${action}`);
  }

  toClaudeTools(): ClaudeTool[] {
    return [
      {
        name: "make__list_scenarios",
        description: "List all available Make.com automation scenarios. Use to discover what automations exist before running one.",
        input_schema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "make__run_scenario",
        description: "Trigger the execution of a Make.com automation scenario by its ID.",
        input_schema: {
          type: "object",
          properties: {
            scenarioId: { type: "number", description: "Numeric ID of the scenario to run (from list_scenarios)" },
          },
          required: ["scenarioId"],
        },
      },
    ];
  }
}
