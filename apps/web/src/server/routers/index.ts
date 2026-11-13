import { router } from "../trpc";
import { projectsRouter } from "./projects";
import { tasksRouter } from "./tasks";
import { appsRouter } from "./apps";
import { notificationsRouter } from "./notifications";
import { toolsRouter } from "./tools";
import { agentsRouter } from "./agents";
import { searchRouter } from "./search";

export const appRouter = router({
  projects: projectsRouter,
  tasks: tasksRouter,
  apps: appsRouter,
  notifications: notificationsRouter,
  tools: toolsRouter,
  agents: agentsRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
