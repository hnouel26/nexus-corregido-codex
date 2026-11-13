// Cron expression utilities for the UI

export const CRON_PRESETS = [
  { label: "Cada 15 minutos", value: "*/15 * * * *" },
  { label: "Cada hora",       value: "0 * * * *"    },
  { label: "Cada día a las 8 AM",  value: "0 8 * * *"   },
  { label: "Cada día a las 6 PM",  value: "0 18 * * *"  },
  { label: "Lunes a viernes 8 AM", value: "0 8 * * 1-5" },
  { label: "Cada lunes 9 AM",      value: "0 9 * * 1"   },
  { label: "Cada domingo medianoche", value: "0 0 * * 0" },
  { label: "Cada 1ro del mes",     value: "0 8 1 * *"   },
  { label: "Personalizado",        value: ""             },
] as const;

// Human-readable description of a cron expression (basic)
export function describeCron(expr: string): string {
  const map: Record<string, string> = {
    "*/15 * * * *": "Cada 15 minutos",
    "0 * * * *":    "Cada hora",
    "0 8 * * *":    "Diario a las 8 AM",
    "0 18 * * *":   "Diario a las 6 PM",
    "0 8 * * 1-5":  "Lunes a viernes 8 AM",
    "0 9 * * 1":    "Cada lunes 9 AM",
    "0 0 * * 0":    "Domingo medianoche",
    "0 8 1 * *":    "1ro de cada mes 8 AM",
  };
  return map[expr] ?? expr;
}

// Basic cron expression validator (5-field standard cron)
export function isValidCron(expr: string): boolean {
  if (!expr.trim()) return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const ranges = [
    [0, 59],  // minute
    [0, 23],  // hour
    [1, 31],  // day of month
    [1, 12],  // month
    [0, 7],   // day of week (0 and 7 = Sunday)
  ];

  return parts.every((part, i) => {
    const [min, max] = ranges[i];
    return part.split(",").every((item) => {
      const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(item);
      if (!match) return false;
      const [, base, step] = match;
      if (step !== undefined && (Number(step) < 1 || Number(step) > max - min + 1)) return false;
      if (base === "*") return true;
      const [start, end = start] = base.split("-").map(Number);
      return start >= min && end <= max && start <= end;
    });
  });
}
