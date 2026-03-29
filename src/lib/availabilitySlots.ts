/** Lundi → Samedi (1–6, comme Date.getDay()). Le dimanche n’est pas édité ici. */
export const WORKING_DAYS = [1, 2, 3, 4, 5, 6] as const;
export type WorkingDay = (typeof WORKING_DAYS)[number];

export const WORKING_DAY_LABELS: Record<WorkingDay, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

/** Première heure de début ; dernière plage finit à END_MIN (excl.). */
const START_MIN = 8 * 60;
const END_MIN = 20 * 60;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** Tous les débuts de créneaux 30 min affichés (08:00 … 19:30). */
export const ALL_SLOT_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let t = START_MIN; t < END_MIN; t += 30) {
    out.push(minutesToHHMM(t));
  }
  return out;
})();

export function slotKey(day: number, time: string): string {
  return `${day}_${time}`;
}

/** Même règle que le backend : créneaux [t, t+30) tant que t+30 <= end. */
export function expandRangeToSlotStarts(startHHMM: string, endHHMM: string): string[] {
  const start = hhmmToMinutes(startHHMM);
  const end = hhmmToMinutes(endHHMM);
  const out: string[] = [];
  for (let t = start; t + 30 <= end; t += 30) {
    out.push(minutesToHHMM(t));
  }
  return out;
}

export function mergeContiguousSlots(sortedStarts: string[]): { start: string; end: string }[] {
  if (sortedStarts.length === 0) return [];
  const sorted = [...sortedStarts].sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b));
  const ranges: { start: string; end: string }[] = [];
  let blockStart = hhmmToMinutes(sorted[0]!);
  let blockEnd = blockStart + 30;
  for (let i = 1; i < sorted.length; i++) {
    const t = hhmmToMinutes(sorted[i]!);
    if (t === blockEnd) {
      blockEnd += 30;
    } else {
      ranges.push({ start: minutesToHHMM(blockStart), end: minutesToHHMM(blockEnd) });
      blockStart = t;
      blockEnd = t + 30;
    }
  }
  ranges.push({ start: minutesToHHMM(blockStart), end: minutesToHHMM(blockEnd) });
  return ranges;
}

export function availRowsToSelection(
  rows: { dayOfWeek: number; startTime: string; endTime: string }[],
): Record<string, boolean> {
  const sel: Record<string, boolean> = {};
  for (const row of rows) {
    if (!WORKING_DAYS.includes(row.dayOfWeek as WorkingDay)) continue;
    const starts = expandRangeToSlotStarts(row.startTime, row.endTime);
    for (const st of starts) {
      sel[slotKey(row.dayOfWeek, st)] = true;
    }
  }
  return sel;
}

export function selectionToAvailSlots(
  selection: Record<string, boolean>,
): { dayOfWeek: number; startTime: string; endTime: string }[] {
  const byDay: Record<number, string[]> = {};
  for (const d of WORKING_DAYS) byDay[d] = [];
  for (const [key, on] of Object.entries(selection)) {
    if (!on) continue;
    const us = key.indexOf('_');
    if (us === -1) continue;
    const day = Number(key.slice(0, us));
    const time = key.slice(us + 1);
    if (!WORKING_DAYS.includes(day as WorkingDay)) continue;
    byDay[day].push(time);
  }
  const slots: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
  for (const d of WORKING_DAYS) {
    const ranges = mergeContiguousSlots(byDay[d]);
    for (const r of ranges) {
      slots.push({ dayOfWeek: d, startTime: r.start, endTime: r.end });
    }
  }
  return slots;
}

export function formatSlotLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
