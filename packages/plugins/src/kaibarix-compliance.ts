import { ClaudeTool, Plugin, PluginConfigField } from './types';

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

  toClaudeTools(): ClaudeTool[] {
    return [
      {
        name: 'kaibarix_get_regulations',
        description: 'Obtiene las regulaciones aplicables para una industria específica en el sistema KAIBARIX',
        input_schema: {
          type: 'object',
          properties: {
            industry: {
              type: 'string',
              enum: [
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
              ],
              description: 'La industria para la cual se obtendrán las regulaciones aplicables',
            },
          },
          required: ['industry'],
        },
      },
      {
        name: 'kaibarix_check_compliance',
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
        name: 'kaibarix_generate_report',
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
        name: 'kaibarix_log_audit',
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
