/**
 * Automated antenatal calculations (Chapter 1.5 / 4.6):
 * gestational age, expected date of delivery, BMI, age and review dates.
 */

export interface GestationalAge {
  weeks: number;
  days: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(iso: string | null | undefined): string {
  const date = parseIsoDate(iso ?? null);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Gestational age from LMP, evaluated at `onDate` (defaults to today). */
export function gestationalAgeFromLmp(lmp: string, onDate: Date = new Date()): GestationalAge | null {
  const lmpDate = parseIsoDate(lmp);
  if (!lmpDate) return null;
  const elapsedDays = Math.floor((onDate.getTime() - lmpDate.getTime()) / MS_PER_DAY);
  if (elapsedDays < 0 || elapsedDays > 320) return null;
  return { weeks: Math.floor(elapsedDays / 7), days: elapsedDays % 7 };
}

export function formatGestationalAge(ga: GestationalAge | null): string {
  if (!ga) return '—';
  return ga.days > 0 ? `${ga.weeks}w ${ga.days}d` : `${ga.weeks} weeks`;
}

/** Naegele's rule: EDD = LMP + 280 days. */
export function eddFromLmp(lmp: string): string | null {
  const lmpDate = parseIsoDate(lmp);
  if (!lmpDate) return null;
  return toIsoDate(new Date(lmpDate.getTime() + 280 * MS_PER_DAY));
}

export function bmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function ageFromDob(dob: string, onDate: Date = new Date()): number | null {
  const dobDate = parseIsoDate(dob);
  if (!dobDate) return null;
  let age = onDate.getFullYear() - dobDate.getFullYear();
  const beforeBirthday =
    onDate.getMonth() < dobDate.getMonth() ||
    (onDate.getMonth() === dobDate.getMonth() && onDate.getDate() < dobDate.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** WHO 2016 ANC model: eight contacts at these gestational weeks. */
const WHO_CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40];

/**
 * Next routine review date following the WHO eight-contact schedule.
 * Falls back to a 2-week review when GA is unknown or near term.
 */
export function nextReviewDate(gaWeeks: number | null, from: Date = new Date()): string {
  if (gaWeeks == null) {
    return toIsoDate(new Date(from.getTime() + 14 * MS_PER_DAY));
  }
  const nextContact = WHO_CONTACT_WEEKS.find((week) => week > gaWeeks);
  if (!nextContact) {
    return toIsoDate(new Date(from.getTime() + 7 * MS_PER_DAY));
  }
  const weeksAhead = Math.min(Math.max(nextContact - gaWeeks, 1), 6);
  return toIsoDate(new Date(from.getTime() + weeksAhead * 7 * MS_PER_DAY));
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && parseIsoDate(value) !== null;
}
