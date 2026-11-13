import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimRun, failInterruptedRun } from '../apps/worker/src/run-state';
function store(initial: string) {
  let row: any = { status: initial };
  return {
    get row() { return row; },
    db: { updateMany: async ({ where, data }: any) => {
      const matches = typeof where.status === 'string' ? row.status === where.status : where.status.in.includes(row.status);
      if (!matches) return { count: 0 };
      row = { ...row, ...data };
      return { count: 1 };
    } } as any,
  };
}
test('reclama una ejecución pendiente', async () => {
  const s = store('PENDING');
  assert.equal(await claimRun(s.db, '1'), true);
  assert.equal(s.row.status, 'RUNNING');
});
test('una ejecución recuperada después de un cierre falla sin repetir acciones', async () => {
  const s = store('RUNNING');
  assert.equal(await claimRun(s.db, '1'), false);
  assert.equal(s.row.status, 'FAILED');
  assert.ok(s.row.endedAt instanceof Date);
});
test('la recuperación no sobrescribe cancelación ni éxito', async () => {
  for (const status of ['CANCELLED', 'COMPLETED', 'FAILED']) {
    const s = store(status);
    assert.equal(await claimRun(s.db, '1'), false);
    await failInterruptedRun(s.db, '1');
    assert.equal(s.row.status, status);
  }
});
