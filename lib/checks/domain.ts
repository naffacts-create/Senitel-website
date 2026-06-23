export type DomainResult = {
  /** Registry expiration date, or null if unavailable. */
  expiresAt: Date | null;
  error?: string;
};

/**
 * Reduce a hostname to its registrable apex.
 * Naive: takes the last two labels (example.com from www.example.com).
 * Known limitation: multi-part ccTLDs like co.uk resolve to "co.uk".
 * Good enough for the MVP; revisit with the public suffix list later.
 */
function toApex(hostname: string): string {
  const labels = hostname.replace(/\.$/, "").split(".");
  if (labels.length <= 2) return hostname;
  return labels.slice(-2).join(".");
}

/**
 * Looks up domain expiry via RDAP (rdap.org bootstrap — free, no API key).
 * RDAP returns a JSON `events` array; we want the "expiration" event.
 */
export async function checkDomain(
  hostname: string,
  timeoutMs = 10_000,
): Promise<DomainResult> {
  const apex = toApex(hostname);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://rdap.org/domain/${apex}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    if (!res.ok) {
      return { expiresAt: null, error: `RDAP responded ${res.status}` };
    }
    const data = (await res.json()) as { events?: Array<{ eventAction?: string; eventDate?: string }> };
    const event = (data.events ?? []).find((e) => e.eventAction === "expiration");
    if (!event?.eventDate) {
      return { expiresAt: null, error: "No expiration event in RDAP record" };
    }
    const expiresAt = new Date(event.eventDate);
    if (Number.isNaN(expiresAt.getTime())) {
      return { expiresAt: null, error: `Unparseable RDAP date: ${event.eventDate}` };
    }
    return { expiresAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "RDAP lookup failed";
    return { expiresAt: null, error: controller.signal.aborted ? "RDAP timed out" : message };
  } finally {
    clearTimeout(timer);
  }
}
