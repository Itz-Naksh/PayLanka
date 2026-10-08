// Dates are stored as calendar dates (midnight UTC). Formatting in UTC keeps
// "8 Jan 2024" from becoming "7 Jan 2024" on a server in another time zone.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Colombo",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** Timestamps (e.g. audit entries) are shown in Sri Lanka time. */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** Date -> "YYYY-MM-DD" for <input type="date">. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at midnight UTC (matches Postgres DATE columns). */
export function fromDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
