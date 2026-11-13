import { prisma } from "./index";
import bcrypt from "bcryptjs";
import type { AppCategory } from "@prisma/client";
import { seedComplianceAgent } from "./seed-compliance-agent";

async function main() {
  const initialPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@nexus.local";
  if (initialPassword.length < 12 || initialPassword === "GENERATE_WITH_SETUP") throw new Error("Configura SEED_ADMIN_PASSWORD con al menos 12 caracteres");
  const password = await bcrypt.hash(initialPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      password,
      role: "ADMIN",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Nexus Platform",
      description: "Plataforma self-hosted de gestión y agentes AI",
      status: "ACTIVE",
      color: "#0085D5",
      userId: user.id,
    },
  });

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-task-1",
        title: "Setup Docker Compose",
        status: "DONE",
        priority: "HIGH",
        projectId: project.id,
        order: 0,
      },
      {
        id: "seed-task-2",
        title: "Implementar autenticación",
        status: "DONE",
        priority: "HIGH",
        projectId: project.id,
        order: 1,
      },
      {
        id: "seed-task-3",
        title: "CRUD de proyectos",
        status: "IN_PROGRESS",
        priority: "HIGH",
        projectId: project.id,
        order: 2,
      },
      {
        id: "seed-task-4",
        title: "Plugin Claude API",
        status: "TODO",
        priority: "MEDIUM",
        projectId: project.id,
        order: 3,
      },
      {
        id: "seed-task-5",
        title: "Agent Manager UI",
        status: "TODO",
        priority: "MEDIUM",
        projectId: project.id,
        order: 4,
      },
    ],
  });

  // Apps de ejemplo (tus herramientas reales)
  const sampleApps: Array<{
    name: string; description: string; url: string; icon: string;
    category: AppCategory; color: string; isPinned: boolean; order: number;
  }> = [
    { name: "KPI OTD", description: "On-Time Delivery dashboard", url: "http://localhost:5500/kpi-otd.html", icon: "📊", category: "DASHBOARD", color: "#0085D5", isPinned: true, order: 0 },
    { name: "KPI Downtime", description: "Unplanned Downtime dashboard", url: "http://localhost:5500/kpi-downtime.html", icon: "⚡", category: "DASHBOARD", color: "#FE5900", isPinned: true, order: 1 },
    { name: "RM Expiry", description: "Raw material expiry tracker", url: "http://localhost:5500/rm-expiry.html", icon: "📋", category: "DASHBOARD", color: "#FEC341", isPinned: true, order: 2 },
    { name: "NFI Regulatory", description: "Regulatory labels & facts panel", url: "http://localhost:3001", icon: "🔬", category: "INTERNAL", color: "#003d7a", isPinned: false, order: 3 },
    { name: "ALERE Rutas", description: "Rutas de manufactura ALERE", url: "http://localhost:5500/alere-rutas.html", icon: "🏭", category: "TOOL", color: "#91D1ED", isPinned: false, order: 4 },
    { name: "Snowflake", description: "Data warehouse NFI", url: "https://app.snowflake.com", icon: "❄️", category: "DATABASE", color: "#29B5E8", isPinned: false, order: 5 },
    { name: "ClickUp", description: "Gestión de proyectos NFI", url: "https://app.clickup.com", icon: "✅", category: "INTEGRATION", color: "#7B68EE", isPinned: false, order: 6 },
    { name: "Make", description: "Automatizaciones NFI", url: "https://make.com", icon: "⚙️", category: "INTEGRATION", color: "#6E49CB", isPinned: false, order: 7 },
  ];

  for (const app of sampleApps) {
    await prisma.app.upsert({
      where: { id: `seed-app-${app.order}` },
      update: {},
      create: { id: `seed-app-${app.order}`, ...app, userId: user.id },
    });
  }

  // Notificación de bienvenida
  await prisma.notification.upsert({
    where: { id: "seed-notif-1" },
    update: {},
    create: {
      id: "seed-notif-1",
      title: "Bienvenido a Nexus",
      message: "Tu Personal OS está listo. Registra tus apps y empieza a gestionar todo desde aquí.",
      type: "SUCCESS",
      userId: user.id,
    },
  });

  // KAIBARIX Compliance Tool
  await prisma.tool.upsert({
    where: { name: "kaibarix_compliance" },
    update: {},
    create: {
      name: "kaibarix_compliance",
      displayName: "KAIBARIX Compliance",
      description: "Sistema de compliance regulatorio con soporte para FDA, HIPAA, GDPR, IRS Circular 230 y más",
      config: {},
      isActive: true,
      category: "COMPLIANCE",
      icon: "🛡️",
    },
  });

  // Agente de compliance por voz
  await seedComplianceAgent(user.id);

  console.log(`Seed completado. Usuario: ${email}. La contraseña se conserva en .env; no se imprime.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
