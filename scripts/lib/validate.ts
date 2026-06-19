import type { DayEntry } from "./config.js";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** ADF treats 09:00 → 00:00 as 15 hours (midnight wrap), not zero. */
export function isMidnightEndTrap(start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const normalizedEnd = end.replace(/^0:/, "00:");
  return start !== "00:00" && (normalizedEnd === "00:00" || end === "0:00");
}

export function expectedHourDisplayValues(hours: number): Set<string> {
  const values = new Set([String(hours)]);
  if (Number.isInteger(hours)) {
    values.add(`${hours}.0`);
  }
  return values;
}

export function findPeriodOptionIndex(
  options: string[],
  periodMatch: string
): number {
  return options.findIndex((o) => o.includes(periodMatch));
}

export function sumWeekHours(days: DayEntry[]): number {
  return days.reduce((sum, day) => sum + day.hours, 0);
}

export function validateCurrentWeek(days: DayEntry[]): void {
  if (days.length !== 7) {
    throw new Error(`Expected 7 days (Mon–Sun), got ${days.length}`);
  }

  for (let i = 0; i < 7; i++) {
    const day = days[i];
    const label = DAY_NAMES[i];

    if (day.hours === 0) {
      if (day.start || day.end || day.break || day.note) {
        throw new Error(`${label}: zero-hour days must not include times or notes`);
      }
      continue;
    }

    if (!day.start || !day.end || !day.break) {
      throw new Error(`${label}: work days require start, end, and break`);
    }

    if (isMidnightEndTrap(day.start, day.end)) {
      throw new Error(
        `${label}: end time ${day.end} with start ${day.start} will calculate as 15h on the portal`
      );
    }
  }
}

export function isExpiredSession(url: string, loginButtonVisible: boolean): boolean {
  return url.includes("/login") || loginButtonVisible;
}
