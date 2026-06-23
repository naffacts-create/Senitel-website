import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSsl } from "./checks/ssl";
import { checkDomain } from "./checks/domain";
import { checkUptime } from "./checks/uptime";
import { sendAlertEmail } from "./email";
import type { AlertType, Site } from "./types";

const DAY = 86_400_000;

/** Thresholds (days) at which we start alerting. */
const SSL_WARN_DAYS = 14;
const DOMAIN_WARN_DAYS = 30;
/** Don't re-send the same alert type for a site more often than this. */
const ALERT_COOLDOWN_DAYS = 3;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / DAY);
}

/**
 * Runs all three checks for a site, persists the snapshot + a history row,
 * and sends deduped email alerts. `ownerEmail` is the address to notify.
 * Returns the snapshot that was written.
 */
export async function runCheck(
  supabase: SupabaseClient,
  site: Pick<Site, "id" | "url">,
  ownerEmail: string,
) {
  const url = normalizeUrl(site.url);
  const hostname = new URL(url).hostname;

  const [uptime, ssl, domain] = await Promise.all([
    checkUptime(url),
    checkSsl(hostname),
    checkDomain(hostname),
  ]);

  const checkedAt = new Date().toISOString();
  const snapshot = {
    last_checked_at: checkedAt,
    is_up: uptime.isUp,
    status_code: uptime.statusCode,
    response_ms: uptime.responseMs,
    ssl_expires_at: ssl.expiresAt?.toISOString() ?? null,
    domain_expires_at: domain.expiresAt?.toISOString() ?? null,
    last_error: uptime.error ?? ssl.error ?? domain.error ?? null,
  };

  await supabase.from("sites").update(snapshot).eq("id", site.id);
  await supabase.from("checks").insert({
    site_id: site.id,
    checked_at: checkedAt,
    is_up: snapshot.is_up,
    status_code: snapshot.status_code,
    response_ms: snapshot.response_ms,
    ssl_expires_at: snapshot.ssl_expires_at,
    domain_expires_at: snapshot.domain_expires_at,
    error: snapshot.last_error,
  });

  // --- Evaluate alert conditions ---
  const sslDays = daysUntil(ssl.expiresAt);
  const domainDays = daysUntil(domain.expiresAt);
  const pending: Array<{ type: AlertType; message: string }> = [];

  if (!uptime.isUp) {
    pending.push({
      type: "down",
      message: `${hostname} is DOWN (${uptime.error ?? `status ${uptime.statusCode}`}).`,
    });
  }
  if (sslDays !== null && sslDays <= SSL_WARN_DAYS) {
    pending.push({
      type: "ssl_expiring",
      message:
        sslDays < 0
          ? `${hostname} SSL certificate has EXPIRED.`
          : `${hostname} SSL certificate expires in ${sslDays} day(s).`,
    });
  }
  if (domainDays !== null && domainDays <= DOMAIN_WARN_DAYS) {
    pending.push({
      type: "domain_expiring",
      message:
        domainDays < 0
          ? `${hostname} domain registration has EXPIRED.`
          : `${hostname} domain expires in ${domainDays} day(s).`,
    });
  }

  for (const alert of pending) {
    if (await recentlyAlerted(supabase, site.id, alert.type)) continue;
    const sent = await sendAlertEmail(ownerEmail, `[Sentinel] ${alert.message}`, alert.message);
    if (sent) {
      await supabase
        .from("alerts")
        .insert({ site_id: site.id, type: alert.type, message: alert.message });
    }
  }

  return snapshot;
}

/** True if we've already alerted this type for this site within the cooldown. */
async function recentlyAlerted(
  supabase: SupabaseClient,
  siteId: string,
  type: AlertType,
): Promise<boolean> {
  const since = new Date(Date.now() - ALERT_COOLDOWN_DAYS * DAY).toISOString();
  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("site_id", siteId)
    .eq("type", type)
    .gte("sent_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
