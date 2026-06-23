// Tiny helper to merge conditional class names (avoids an extra dependency).
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
