import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptConfig, decryptConfig } from '../packages/plugins/src/encrypt';
import { getPlugin } from '../packages/plugins/src/index';

test('conserva claves y texto Unicode al cifrar', () => {
  const config = { apiKey: 'prueba', texto: 'Análisis 日本語 🚀' };
  assert.deepEqual(decryptConfig(encryptConfig(config, 'x'.repeat(32)), 'x'.repeat(32)), config);
});
test('el cifrado rechaza claves débiles', () => {
  assert.throws(() => encryptConfig({ apiKey: 'secret' }, 'short'), /32/);
});
test('no acepta contenido cifrado alterado', () => {
  const encrypted = encryptConfig({ apiKey: 'secret' }, 'x'.repeat(32));
  const parts = encrypted.split(':');
  parts[2] = (parts[2][0] === '0' ? '1' : '0') + parts[2].slice(1);
  assert.throws(() => decryptConfig(parts.join(':'), 'x'.repeat(32)));
});
test('Make no oculta errores HTTP como resultados correctos', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"denied"}', { status: 401 }));
  await assert.rejects(() => getPlugin('make')!.execute('list_scenarios', {}, { apiKey: 'fake', teamId: '1', region: 'eu2' }), /401/);
});
test('ClickUp valida los argumentos antes de solicitar acciones', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}'); });
  await assert.rejects(() => getPlugin('clickup')!.execute('create_task', { name: '' }, { apiKey: 'fake' }));
  assert.equal(calls, 0);
});
test('Snowflake usa el tipo de token PAT', async (t) => {
  let tokenType: unknown;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: any) => {
    tokenType = options.headers['X-Snowflake-Authorization-Token-Type'];
    return new Response(JSON.stringify({ data: [], resultSetMetaData: { numRows: 0, rowType: [] } }));
  });
  await getPlugin('snowflake')!.execute('query', { sql: 'SELECT 1' }, { account: 'example', patToken: 'fake' });
  assert.equal(tokenType, 'PROGRAMMATIC_ACCESS_TOKEN');
});

test('KAIBARIX ofrece configuración, acciones y nombres de herramientas compatibles con el worker', () => {
  const plugin = getPlugin('kaibarix_compliance')!;
  assert.ok(plugin.getConfigFields().some((field) => field.key === 'kaibarixApiUrl' && field.required));
  const actions = new Set(plugin.getActions().map((action) => action.name));
  assert.equal(actions.size, 4);
  for (const tool of plugin.toClaudeTools()) {
    assert.ok(tool.name.startsWith(plugin.name + '__'));
    assert.ok(actions.has(tool.name.slice(plugin.name.length + 2)));
  }
});
test('KAIBARIX ejecuta una acción a través de la interfaz de plugins', async (t) => {
  let requestedUrl: unknown;
  let requestedHeaders: unknown;
  t.mock.method(globalThis, 'fetch', async (url: unknown, options: any) => {
    requestedUrl = url;
    requestedHeaders = options.headers;
    return new Response(JSON.stringify({ regulations: ['HIPAA'] }));
  });
  const result = await getPlugin('kaibarix_compliance')!.execute('get_regulations', { industry: 'HEALTHCARE' }, {
    kaibarixApiUrl: 'https://example.test/api/compliance',
    kaibarixApiKey: 'fake',
  });
  assert.equal(requestedUrl, 'https://example.test/api/compliance/regulations/HEALTHCARE');
  assert.equal((requestedHeaders as Record<string, string>).Authorization, 'Bearer fake');
  assert.deepEqual(result, { regulations: ['HIPAA'] });
});
test('KAIBARIX rechaza parámetros inválidos antes de realizar solicitudes', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}'); });
  await assert.rejects(() => getPlugin('kaibarix_compliance')!.execute('get_regulations', { industry: 'INVALID' }, {}));
  assert.equal(calls, 0);
});
