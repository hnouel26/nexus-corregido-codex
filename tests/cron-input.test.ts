import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCron } from '../apps/web/src/lib/cron';
test('rechaza sufijos inválidos en números y pasos', () => {
  for (const expr of ['1abc * * * *', '*/2abc * * * *', '1,2abc * * * *', '1-2-3 * * * *']) {
    assert.equal(isValidCron(expr), false, expr);
  }
});
test('admite listas y rangos con pasos válidos', () => {
  assert.equal(isValidCron('0,15,30,45 8-18/2 * * 1-5'), true);
});
