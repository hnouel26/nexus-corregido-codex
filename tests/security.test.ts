import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toolsRouter } from '../apps/web/src/server/routers/tools';
import { agentsRouter } from '../apps/web/src/server/routers/agents';

function context(role = 'USER', extra: Record<string, unknown> = {}) {
  return {
    session: { user: { id: 'user-1' }, expires: '2030-01-01' },
    prisma: { user: { findUnique: async () => ({ role }) }, ...extra },
  } as any;
}
test('una cuenta USER no puede cambiar credenciales compartidas', async () => {
  const caller = toolsRouter.createCaller(context());
  await assert.rejects(() => caller.connect({ pluginName: 'openai', config: { apiKey: 'fake' } }), { code: 'FORBIDDEN' });
});
test('una cuenta USER no puede ejecutar acciones con credenciales compartidas', async () => {
  const caller = toolsRouter.createCaller(context());
  await assert.rejects(() => caller.execute({ pluginName: 'make', action: 'run_scenario', params: { scenarioId: 1 } }), { code: 'FORBIDDEN' });
});
test('un visitante sin sesión no puede consultar integraciones', async () => {
  const caller = toolsRouter.createCaller({ ...context(), session: null });
  await assert.rejects(() => caller.listPlugins(), { code: 'UNAUTHORIZED' });
});
test('los calendarios inválidos son rechazados por el servidor', async () => {
  const caller = agentsRouter.createCaller(context('ADMIN'));
  await assert.rejects(() => caller.create({ name: 'test', systemPrompt: 'test', trigger: 'SCHEDULE', cronExpr: '1abc * * * *' }), { code: 'BAD_REQUEST' });
});
test('cancelar no cambia una ejecución que ya terminó', async () => {
  let status = 'COMPLETED';
  const caller = agentsRouter.createCaller(context('ADMIN', {
    agentRun: {
      findFirst: async () => ({ id: 'run-1', status }),
      updateMany: async ({ where, data }: any) => {
        if (!where.status.in.includes(status)) return { count: 0 };
        status = data.status;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ id: 'run-1', status }),
    },
  }));
  assert.equal((await caller.cancelRun({ id: 'run-1' })).status, 'COMPLETED');
});
test('una ejecución en curso sí se puede cancelar', async () => {
  let status = 'RUNNING';
  const caller = agentsRouter.createCaller(context('ADMIN', {
    agentRun: {
      findFirst: async () => ({ id: 'run-1', status }),
      updateMany: async ({ where, data }: any) => {
        if (!where.status.in.includes(status)) return { count: 0 };
        status = data.status;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ id: 'run-1', status }),
    },
  }));
  assert.equal((await caller.cancelRun({ id: 'run-1' })).status, 'CANCELLED');
});
