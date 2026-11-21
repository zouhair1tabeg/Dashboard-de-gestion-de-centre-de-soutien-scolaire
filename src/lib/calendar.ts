const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export const WEEKDAY_SHORT_LABELS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."] as const;

/** Convertit une date métier « AAAA-MM-JJ » en Date UTC (minuit). */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Convertit une Date en clé « AAAA-MM-JJ » (UTC). */
export function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return toDateKey(new Date(parseDateOnly(value).getTime() + days * DAY_MS));
}

export function addMonths(value: string, months: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));

  return toDateKey(date);
}

/** Lundi de la semaine contenant la date donnée. */
export function startOfWeek(value: string): string {
  const day = parseDateOnly(value).getUTCDay();
  const offset = (day + 6) % 7;

  return addDays(value, -offset);
}

export function endOfWeek(value: string): string {
  return addDays(startOfWeek(value), 6);
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function endOfMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);

  return toDateKey(new Date(Date.UTC(year, month, 0)));
}

/** Bornes de la grille mensuelle (semaines complètes, lundi → dimanche). */
export function monthGridRange(value: string): { start: string; end: string } {
  return {
    start: startOfWeek(startOfMonth(value)),
    end: endOfWeek(endOfMonth(value)),
  };
}

export function weekRange(value: string): { start: string; end: string } {
  return { start: startOfWeek(value), end: endOfWeek(value) };
}

export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;

  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function weekDays(value: string): string[] {
  const { start, end } = weekRange(value);

  return eachDay(start, end);
}

export function monthDays(value: string): string[] {
  const { start, end } = monthGridRange(value);

  return eachDay(start, end);
}

export function isSameMonth(value: string, reference: string): boolean {
  return value.slice(0, 7) === reference.slice(0, 7);
}

/** « novembre 2026 » */
export function formatMonthYear(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(value));
}

/** « 16 – 22 novembre 2026 » */
export function formatWeekRange(value: string): string {
  const { start, end } = weekRange(value);
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);

  const startLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "long" }),
    timeZone: "UTC",
  }).format(startDate);

  const endLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate);

  return `${startLabel} – ${endLabel}`;
}

/** « vendredi 20 novembre 2026 » */
export function formatLongDate(value: string): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(value));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** « ven. 20 nov. » */
export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseDateOnly(value));
}

export function weekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_LABELS[dayOfWeek] ?? "—";
}

export function dayOfWeek(value: string): number {
  return parseDateOnly(value).getUTCDay();
}
