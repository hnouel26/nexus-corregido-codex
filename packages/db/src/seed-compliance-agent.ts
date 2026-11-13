import { prisma } from "./index";

export async function seedComplianceAgent(userId: string) {
  const agent = await prisma.agent.upsert({
    where: { id: "compliance-voice-agent" },
    update: {},
    create: {
      id: "compliance-voice-agent",
      name: "Agente de Compliance por Voz",
      description: "Agente especializado en compliance regulatorio que acepta comandos de voz para generar reportes, verificar compliance y registrar auditorías",
      systemPrompt: `Eres un experto en compliance regulatorio del sistema KAIBARIX. Tu función es ayudar a los usuarios a:

1. Consultar regulaciones aplicables para diferentes industrias
2. Verificar el estado de compliance de organizaciones
3. Generar reportes de compliance
4. Registrar eventos de auditoría

Cuando el usuario te pida información sobre compliance, usa las herramientas de KAIBARIX disponibles. Responde siempre en español de forma clara y profesional.

Para las regulaciones más comunes:
- FDA 21 CFR Part 11: Para industrias farmacéuticas y biotecnología
- HIPAA: Para servicios de salud
- IRS Circular 230: Para preparadores de impuestos
- GDPR: Para empresas que operan en Europa
- PCI DSS: Para procesamiento de pagos
- SOC 2: Para servicios en la nube
- ISO 27001: Para seguridad de la información

Si no tienes la información solicitada, indica qué datos necesitas del usuario.`,
      model: "gpt-4o",
      trigger: "MANUAL",
      isActive: true,
      userId,
    },
  });

  // Conectar el plugin de KAIBARIX Compliance
  const kaibarixTool = await prisma.tool.findUnique({
    where: { name: "kaibarix_compliance" },
  });

  if (kaibarixTool) {
    await prisma.agentTool.upsert({
      where: {
        agentId_toolId: {
          agentId: agent.id,
          toolId: kaibarixTool.id,
        },
      },
      update: {},
      create: {
        agentId: agent.id,
        toolId: kaibarixTool.id,
        config: {},
      },
    });
  }

  console.log("Agente de compliance por voz creado:", agent.name);
  return agent;
}
