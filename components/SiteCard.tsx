"use client";

import { useState } from "react";
import type { Site } from "@/lib/types";
import { HealthBadge } from "./HealthBadge";

const DAY = 86_400_000;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / DAY);
}

/** Colored "expires in N days" chip. */
function ExpiryChip({ label, iso, warnAt }: { label: string; iso: string | null; warnAt: number }) {
  const days = daysUntil(iso);
  if (days === null) return <span className="text-xs text-neutral-400">{label}: —</span>;
  const tone =
    days < 0 ? "text-danger font-semibold" : days <= warnAt ? "text-warn font-medium" : "text-neutral-600";
  const text = days < 0 ? "expired" : `${days}d`;
  return (
    <span className={`text-xs ${tone}`}>
      {label}: {text}
    </span>
  );
}

export function SiteCard({ site, onChanged }: { site: Site; onChanged: () => void }) {
  const [busy, setBusy] = useState<"recheck" | "delete" | null>(null);

  async function recheck() {
    setBusy("recheck");
    await fetch(`/api/sites/${site.id}`, { method: "POST" });
    setBusy(null);
    onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${site.name ?? site.url}?`)) return;
    setBusy("delete");
    await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
    setBusy(null);
    onChanged();
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <HealthBadge isUp={site.is_up} lastError={site.last_error} />
          <span className="truncate font-medium">{site.name ?? site.url}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-3">
          <ExpiryChip label="SSL" iso={site.ssl_expires_at} warnAt={14} />
          <ExpiryChip label="Domain" iso={site.domain_expires_at} warnAt={30} />
          {site.response_ms != null && (
            <span className="text-xs text-neutral-500">{site.response_ms}ms</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={recheck}
          disabled={busy !== null}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {busy === "recheck" ? "…" : "Re-check"}
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="rounded-md border border-red-200 px-3 py-1 text-sm text-danger hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
