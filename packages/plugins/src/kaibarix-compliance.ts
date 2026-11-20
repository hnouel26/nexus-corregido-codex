import { z } from 'zod';
import type { ClaudeTool, Plugin, PluginConfigField, PluginAction, TestResult } from './types';
import { validatePluginInput } from './validation';

const INDUSTRIES = [
                'HEALTHCARE',
                'FINANCIAL_SERVICES',
                'TAX_PREPARATION',
                'RETAIL',
                'MANUFACTURING',
                'PHARMACEUTICALS',
                'BIOTECH',
                'FOOD_BEVERAGE',
                'AEROSPACE',
                'AUTOMOTIVE',
                'ENERGY',
                'TECHNOLOGY',
                'EDUCATION',
                'GOVERNMENT',
                'LEGAL',
                'TELECOMMUNICATIONS',
                'LOGISTICS',
                'CONSTRUCTION',
                'INSURANCE',
                'REAL_ESTATE',
              ] as const;

export class KaibarixCompliancePlugin implements Plugin {
  name = 'kaibarix_compliance';
  displayName = 'KAIBARIX Compliance';
  description = 'Integración con el sistema de compliance regulatorio de KAIBARIX';
  icon = '🛡️';
  category = 'compliance';

  configFields: PluginConfigField[] = [
    {
      key: 'kaibarixApiUrl',
      label: 'API URL de KAIBARIX',
      type: 'text',
      placeholder: 'http://localhost:3001/api/compliance',
      required: true,
    },
    {
      key: 'kaibarixApiKey',
      label: 'API Key de KAIBARIX',
      type: 'password',
      placeholder: 'Tu API key de KAIBARIX',
      required: false,
    },
  ];


  getConfigFields(): PluginConfigField[] {
    return this.configFields;
  }

  getActions(): PluginAction[] {
    return [
      { name: 'get_regulations', label: 'Consultar regulaciones', description: 'Regulaciones aplicables a una industria', inputSchema: z.object({ industry: z.enum(INDUSTRIES) }) },
      { name: 'check_compliance', label: 'Verificar compliance', description: 'Estado de una regulación', inputSchema: z.object({ regulation: z.string().min(1), organizationId: z.string().min(1).optional() }) },
      { name: 'generate_report', label: 'Generar reporte', description: 'Reporte de compliance por período', inputSchema: z.object({ organizationId: z.string().min(1), frameworkId: z.string().min(1).optional(), startDate: z.string().date(), endDate: z.string().date() }) },
      { name: 'log_audit', label: 'Registrar auditoría', description: 'Registrar un evento de auditoría', inputSchema: z.object({ userId: z.string().min(1), action: z.string().min(1), resource: z.string().min(1), resourceId: z.string().min(1), regulation: z.string().min(1), metadata: z.record(z.unknown()).optional() }) },
    ];
  }

  async test(config: Record<string, string>): Promise<TestResult> {
    if (!config.kaibarixApiUrl) return { ok: false, message: 'API URL de KAIBARIX requerida' };
    try {
      await this.execute('get_regulations', { industry: 'HEALTHCARE' }, config);
      return { ok: true, message: 'Conexión con KAIBARIX verificada' };
    } catch (error) {
      return { ok: false, message: 'Error de conexión con KAIBARIX', detail: String(error) };
    }
  }

  async execute(action: string, params: unknown, config: Record<string, string>): Promise<unknown> {
    const input = validatePluginInput(this, action, params);
    return this.executeAction(action, input, config);
  }

  toClaudeTools(): ClaudeTool[] {
    return [
      {
        name: 'kaibarix_compliance__get_regulations',
        description: 'Obtiene las regulaciones aplicables para una industria específica en el sistema KAIBARIX',
        input_schema: {
          type: 'object',
          properties: {
            industry: {
              type: 'string',
              enum: [...INDUSTRIES],
              description: 'La industria para la cual se obtendrán las regulaciones aplicables',
            },
          },
          required: ['industry'],
        },
      },
      {
        name: 'kaibarix_compliance__check_compliance',
        description: 'Verifica el estado de compliance para una regulación específica',
        input_schema: {
          type: 'object',
          properties: {
            regulation: {
              type: 'string',
              description: 'El código de la regulación a verificar (ej: FDA_21_CFR_PART_11, HIPAA, GDPR)',
            },
            organizationId: {
              type: 'string',
              description: 'ID de la organización (opcional)',
            },
          },
          required: ['regulation'],
        },
      },
      {
        name: 'kaibarix_compliance__generate_report',
        description: 'Genera un reporte de compliance para un período específico',
        input_schema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'ID de la organización',
            },
            frameworkId: {
              type: 'string',
              description: 'ID del framework de compliance',
            },
            startDate: {
              type: 'string',
              description: 'Fecha de inicio en formato ISO (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'Fecha de fin en formato ISO (YYYY-MM-DD)',
            },
          },
          required: ['organizationId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'kaibarix_compliance__log_audit',
        description: 'Registra un evento de auditoría en el sistema de compliance',
        input_schema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID del usuario que realizó la acción',
            },
            action: {
              type: 'string',
              description: 'La acción realizada (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.)',
            },
            resource: {
              type: 'string',
              description: 'El recurso afectado',
            },
            resourceId: {
              type: 'string',
              description: 'ID del recurso',
            },
            regulation: {
              type: 'string',
              description: 'La regulación aplicable',
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales del evento',
            },
          },
          required: ['userId', 'action', 'resource', 'resourceId', 'regulation'],
        },
      },
    ];
  }

  async executeAction(action: string, input: any, config: Record<string, string>): Promise<any> {
    const apiUrl = config.kaibarixApiUrl || 'http://localhost:3001/api/compliance';
    const apiKey = config.kaibarixApiKey;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      let endpoint = '';
      let method = 'GET';
      let body: any = undefined;

      switch (action) {
        case 'get_regulations':
          endpoint = `/regulations/${input.industry}`;
          break;
        case 'check_compliance':
          endpoint = '/check';
          method = 'POST';
          body = input;
          break;
        case 'generate_report':
          endpoint = '/report';
          method = 'POST';
          body = input;
          break;
        case 'log_audit':
          endpoint = '/audit-log';
          method = 'POST';
          body = input;
          break;
        default:
          throw new Error(`Acción desconocida: ${action}`);
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error ejecutando acción kaibarix ${action}:`, error);
      throw error;
    }
  }
}
