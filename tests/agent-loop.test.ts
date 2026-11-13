import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAgentLoop, RunCancelledError } from '../apps/worker/src/agent-loop';

function harness(responses: any[], overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  return {
    calls,
    options: {
      messages: [{ role: 'user', content: 'Prueba' }] as any[],
      request: async () => { calls.push('request'); return responses.shift(); },
      executeTool: async () => { calls.push('tool'); return { ok: true }; },
      log: async () => {},
      isCancelled: async () => false,
      maxIterations: 2,
      ...overrides,
    },
  };
}
const stop = { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Listo' } }] };
const tool = { choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: '1', type: 'function', function: { name: 'make__run_scenario', arguments: '{"scenarioId":1}' } }] } }] };

test('devuelve el resultado final', async () => {
  const h = harness([stop]);
  assert.equal(await runAgentLoop(h.options), 'Listo');
});
test('una cancelación previa no llama al proveedor ni a herramientas', async () => {
  const h = harness([stop], { isCancelled: async () => true });
  await assert.rejects(() => runAgentLoop(h.options), RunCancelledError);
  assert.deepEqual(h.calls, []);
});
test('comprueba cancelación después de la respuesta antes de una acción externa', async () => {
  let cancelled = false;
  const h = harness([], { request: async () => { cancelled = true; return tool; }, isCancelled: async () => cancelled });
  await assert.rejects(() => runAgentLoop(h.options), RunCancelledError);
  assert.deepEqual(h.calls, []);
});
test('agotar iteraciones no se presenta como completado', async () => {
  const h = harness([tool, tool]);
  await assert.rejects(() => runAgentLoop(h.options), /iteraciones/i);
});
test('una respuesta truncada no se presenta como completada', async () => {
  const h = harness([{ choices: [{ finish_reason: 'length', message: { content: 'Incompleto' } }] }]);
  await assert.rejects(() => runAgentLoop(h.options), /length/);
});
test('argumentos JSON inválidos no ejecutan la herramienta', async () => {
  const bad = structuredClone(tool);
  bad.choices[0].message.tool_calls[0].function.arguments = 'invalid';
  const h = harness([bad, stop]);
  assert.equal(await runAgentLoop(h.options), 'Listo');
  assert.ok(!h.calls.includes('tool'));
});
