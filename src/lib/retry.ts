// Exponential backoff + jitter. Only retries errors marked as transient.

export class TransientError extends Error {}

interface RetryOpts {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseMs = 300, maxMs = 4000 }: RetryOpts = {}
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const retriable = err instanceof TransientError;
      if (!retriable || attempt > retries) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff * 0.3;
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
}
