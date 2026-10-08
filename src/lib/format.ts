// Three-letter months everywhere (en-GB on its own would print "Sept").
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: String(Number(get("day"))), // "08" -> "8"
    month: MONTHS[Number(get("month")) - 1],
    year: get("year"),
    time: `${get("hour")}:${get("minute")}`,
  };
}

// Dates are stored as calendar dates (midnight UTC). Formatting in UTC keeps
// "8 Jan 2024" from becoming "7 Jan 2024" on a server in another time zone.
export function formatDate(date: Date): string {
  const { day, month, year } = partsIn(date, "UTC");
  return `${day} ${month} ${year}`;
}

/** Timestamps (e.g. audit entries) are shown in Sri Lanka time: "26 Sep 2026, 12:30". */
export function formatDateTime(date: Date): string {
  const { day, month, year, time } = partsIn(date, "Asia/Colombo");
  return `${day} ${month} ${year}, ${time}`;
}

/** Date -> "YYYY-MM-DD" for <input type="date">. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at midnight UTC (matches Postgres DATE columns). */
export function fromDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
