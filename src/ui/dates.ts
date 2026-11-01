/** Small date helpers for the daily challenge and streaks (local time). */

/** Local calendar date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days in a row with a finished daily challenge, ending today (or yesterday, so a streak survives until tonight). */
export function streakOf(daily: Record<string, number>, now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!(today(d) in daily)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (today(d) in daily) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
