const REPORT_TIMEZONE = "Pacific/Auckland";

function offsetMsAt(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second,
  );
  return asUTC - utcMs;
}

function toCalendarParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** UTC instant corresponding to 00:00:00.000 on `dateStr` in the report timezone. */
export function startOfDayInReportTz(dateStr: string): Date {
  const { y, m, d } = toCalendarParts(dateStr);
  const wallClock = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  return new Date(wallClock - offsetMsAt(wallClock, REPORT_TIMEZONE));
}

/** UTC instant corresponding to 23:59:59.999 on `dateStr` in the report timezone. */
export function endOfDayInReportTz(dateStr: string): Date {
  const { y, m, d } = toCalendarParts(dateStr);
  const wallClock = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return new Date(wallClock - offsetMsAt(wallClock, REPORT_TIMEZONE));
}

/** Today's calendar date (YYYY-MM-DD) in the report timezone. */
export function todayInReportTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIMEZONE }).format(
    new Date(),
  );
}
