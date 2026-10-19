export function getVNDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Calculates nextDueDate = date + intervalDays in Vietnam calendar (Asia/Ho_Chi_Minh).
 */
export function calculateNextDueDateVN(logDate: Date, intervalDays: number): Date {
  const dateKey = getVNDateKey(logDate);
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + intervalDays));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00.000+07:00`);
}
