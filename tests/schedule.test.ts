import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduledSlot } from '../apps/worker/src/schedule-utils';

test('reconoce una hora programada sin ejecuciones previas', () => {
  assert.equal(scheduledSlot('0 8 * * *', new Date('2026-10-22T08:00:12Z')), '2026-10-22T08:00:00.000Z');
});
test('no dispara en una hora diferente', () => {
  assert.equal(scheduledSlot('0 8 * * *', new Date('2026-10-22T09:00:00Z')), null);
});
test('la clave de deduplicación es estable durante el minuto', () => {
  assert.equal(scheduledSlot('* * * * *', new Date('2026-10-22T08:00:00Z')), scheduledSlot('* * * * *', new Date('2026-10-22T08:00:59Z')));
});
test('rechaza un calendario inválido', () => {
  assert.equal(scheduledSlot('invalid', new Date()), null);
});
