export type UptimeResult = {
  isUp: boolean;
  statusCode: number | null;
  responseMs: number | null;
  error?: string;
};

/**
 * Fetches the URL and measures latency.
 * "Up" = the server responded with status < 400, or auth errors (401/403).
 * Down = 404, 410, 5xx (server errors).
 * "Up" means the server is alive; auth errors still count as up.
 */
export async function checkUptime(
  url: string,
  timeoutMs = 15_000,
): Promise<UptimeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "SentinelBot/1.0 (+https://sentinel.app)" },
    });
    const responseMs = Math.round(performance.now() - start);
    // 401/403 = auth required but server is alive. 404/410 = not found = down.
    const isUp = res.status < 400 || res.status === 401 || res.status === 403;
    return { isUp, statusCode: res.status, responseMs };
  } catch (err) {
    const aborted = controller.signal.aborted;
    const message = err instanceof Error ? err.message : "Request failed";
    return {
      isUp: false,
      statusCode: null,
      responseMs: null,
      error: aborted ? "Request timed out" : message,
    };
  } finally {
    clearTimeout(timer);
  }
}
