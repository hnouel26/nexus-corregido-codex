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
