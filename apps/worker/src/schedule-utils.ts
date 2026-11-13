import { Cron } from 'croner';

/** Due slot for the current minute. No implicit catch-up after downtime. */
export function scheduledSlot(expr: string, now = new Date(), timezone = 'UTC'): string | null {
  let cron: Cron | undefined;
  try {
    const minute = new Date(now);
    minute.setUTCSeconds(0, 0);
    cron = new Cron(expr, { paused: true, timezone });
    const next = cron.nextRun(new Date(minute.getTime() - 1));
    return next?.getTime() === minute.getTime() ? minute.toISOString() : null;
  } catch {
    return null;
  } finally {
    cron?.stop();
  }
}
