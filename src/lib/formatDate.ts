// Matches "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

export function formatDate(value: string): string {
  if (!ISO_DATE_RE.test(value)) return value;

  const hasTime = value.includes("T");
  const date = new Date(hasTime ? value : `${value}T00:00`);
  if (isNaN(date.getTime())) return value;

  if (hasTime) {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// JSON.stringify replacer that formats ISO date strings for display
export function dateAwareStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "string" && ISO_DATE_RE.test(val) ? formatDate(val) : val),
    2
  );
}
