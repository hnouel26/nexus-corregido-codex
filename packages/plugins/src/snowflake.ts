import { validatePluginInput } from "./validation";
import { fetchJson } from "./http";
import { z } from "zod";
import type { Plugin, PluginConfigField, PluginAction, TestResult, ClaudeTool } from "./types";

// Usa la REST API de Snowflake (SQL API v2) con PAT token
// No requiere SDK nativo — solo fetch

interface SnowflakeStatementResult {
  statementHandle: string;
  resultSetMetaData: {
    numRows: number;
    rowType: Array<{ name: string; type: string }>;
  };
  data: string[][];
  code?: string;
  message?: string;
}

export class SnowflakePlugin implements Plugin {
  readonly name = "snowflake";
  readonly displayName = "Snowflake";
  readonly description = "Snowflake Data Cloud — ejecuta SQL y consulta data warehouse NFI";
  readonly icon = "❄️";
  readonly category = "Database";

  getConfigFields(): PluginConfigField[] {
    return [
      {
        key: "account",
        label: "Account identifier",
        type: "text",
        placeholder: "ab12345.us-east-1",
        required: true,
        hint: "Formato: orgname-accountname o legacy accountid.region",
      },
      {
        key: "patToken",
        label: "PAT Token",
        type: "password",
        placeholder: "ver-...",
        required: true,
        hint: "Personal Access Token — se encuentra en Snowsight > Profile > PAT",
      },
      {
        key: "warehouse",
        label: "Warehouse",
        type: "text",
        placeholder: "COMPUTE_WH",
        required: false,
      },
      {
        key: "database",
        label: "Base de datos por defecto",
        type: "text",
        placeholder: "NFI_DB",
        required: false,
      },
      {
        key: "schema",
        label: "Schema por defecto",
        type: "text",
        placeholder: "PUBLIC",
        required: false,
      },
      {
        key: "role",
        label: "Role",
        type: "text",
        placeholder: "SYSADMIN",
        required: false,
      },
    ];
  }

  getActions(): PluginAction[] {
    return [
      {
        name: "query",
        label: "Ejecutar SQL",
        description: "Ejecuta una consulta SQL y devuelve los resultados como array de objetos",
        inputSchema: z.object({
          sql: z.string().min(1),
          warehouse: z.string().optional(),
          database: z.string().optional(),
          schema: z.string().optional(),
          role: z.string().optional(),
          timeout: z.number().int().min(1).max(300).default(60),
        }),
      },
      {
        name: "queryRaw",
        label: "Ejecutar SQL (raw)",
        description: "Igual que query pero devuelve filas como arrays en lugar de objetos",
        inputSchema: z.object({
          sql: z.string().min(1),
          warehouse: z.string().optional(),
        }),
      },
    ];
  }

  private baseUrl(account: string): string {
    if (!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(account)) throw new Error("Account de Snowflake inválido");
    return `https://${account}.snowflakecomputing.com`;
  }

  private headers(patToken: string) {
    return {
      Authorization: `Bearer ${patToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    };
  }

  async test(config: Record<string, string>): Promise<TestResult> {
    if (!config.account || !config.patToken) {
      return { ok: false, message: "Account y PAT token requeridos" };
    }
    try {
      const result = await this.runSQL(
        "SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_WAREHOUSE(), CURRENT_DATABASE()",
        config
      );
      if (result.code && result.code !== "090001") {
        return { ok: false, message: result.message ?? "Error de Snowflake", detail: result.code };
      }
      const row = result.data?.[0] ?? [];
      return {
        ok: true,
        message: `Conectado como ${row[0] ?? "?"} · Role: ${row[1] ?? "?"} · WH: ${row[2] ?? "?"}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message: "Error de conexión", detail: message };
    }
  }

  private async runSQL(
    sql: string,
    config: Record<string, string>,
    overrides?: { warehouse?: string; database?: string; schema?: string; role?: string; timeout?: number }
  ): Promise<SnowflakeStatementResult> {
    const url = `${this.baseUrl(config.account)}/api/v2/statements`;

    const body: Record<string, unknown> = { statement: sql, timeout: overrides?.timeout ?? 60 };
    if (overrides?.warehouse ?? config.warehouse) body.warehouse = overrides?.warehouse ?? config.warehouse;
    if (overrides?.database ?? config.database) body.database = overrides?.database ?? config.database;
    if (overrides?.schema ?? config.schema) body.schema = overrides?.schema ?? config.schema;
    if (overrides?.role ?? config.role) body.role = overrides?.role ?? config.role;

    const res = await fetchJson(url, {
      method: "POST",
      headers: this.headers(config.patToken),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout((overrides?.timeout ?? 60) * 1000 + 5000),
    });

    let result = await res.json() as SnowflakeStatementResult;
    // SQL API may return 202 while the warehouse starts. Poll a bounded
    // number of times instead of claiming an empty query result.
    let status = res.status;
    for (let attempt = 0; status === 202 && attempt < 20; attempt++) {
      if (!result.statementHandle) throw new Error("Snowflake no devolvió statementHandle");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const poll = await fetchJson(`${url}/${encodeURIComponent(result.statementHandle)}`, { headers: this.headers(config.patToken) });
      status = poll.status;
      result = await poll.json() as SnowflakeStatementResult;
    }
    if (status === 202) throw new Error("Snowflake sigue procesando; revisa la consulta en Snowsight");
    return result;
  }

  async execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown> {
    if (action === "query" || action === "queryRaw") {
      const p = validatePluginInput(this, action, params) as {
        sql: string;
        warehouse?: string;
        database?: string;
        schema?: string;
        role?: string;
        timeout?: number;
      };

      const result = await this.runSQL(p.sql, config, p);

      if (result.code && result.code !== "090001") {
        throw new Error(`Snowflake error ${result.code}: ${result.message}`);
      }

      const columns = result.resultSetMetaData?.rowType?.map((c) => c.name) ?? [];
      const rows = result.data ?? [];

      if (action === "queryRaw") {
        return { columns, rows, rowCount: rows.length, totalRows: result.resultSetMetaData?.numRows ?? rows.length, truncated: (result.resultSetMetaData?.numRows ?? rows.length) > rows.length };
      }

      // Convert to array of objects
      const objects = rows.map((row) =>
        Object.fromEntries(columns.map((col, i) => [col, row[i]]))
      );

      return {
        rows: objects,
        rowCount: objects.length,
        totalRows: result.resultSetMetaData?.numRows ?? objects.length,
        truncated: (result.resultSetMetaData?.numRows ?? objects.length) > objects.length,
        columns,
        statementHandle: result.statementHandle,
      };
    }

    throw new Error(`Acción desconocida: ${action}`);
  }

  toClaudeTools(): ClaudeTool[] {
    return [
      {
        name: "snowflake__query",
        description:
          "Execute a SQL query on the Snowflake data warehouse and return results as an array of objects. Use for data analysis, KPIs, inventory, orders, and any NFI business data.",
        input_schema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SQL query to execute. Always use LIMIT to avoid large result sets.",
            },
            warehouse: {
              type: "string",
              description: "Snowflake warehouse to use (optional, uses default if omitted).",
            },
            database: {
              type: "string",
              description: "Database to query (optional, uses default if omitted).",
            },
            schema: {
              type: "string",
              description: "Schema to query (optional, uses default if omitted).",
            },
          },
          required: ["sql"],
        },
      },
    ];
  }
}
