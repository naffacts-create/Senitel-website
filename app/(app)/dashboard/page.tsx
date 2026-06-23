"use client";

import { useCallback, useEffect, useState } from "react";
import type { Site } from "@/lib/types";
import { SiteCard } from "@/components/SiteCard";
import { AddSiteForm } from "@/components/AddSiteForm";

const FAR_FUTURE = Number.MAX_SAFE_INTEGER;

/** Soonest expiry (SSL or domain) in ms; down sites bubble to the very top. */
function riskScore(site: Site): number {
  if (site.is_up === false) return -1;
  const candidates = [site.ssl_expires_at, site.domain_expires_at]
    .filter(Boolean)
    .map((iso) => new Date(iso as string).getTime());
  return candidates.length ? Math.min(...candidates) : FAR_FUTURE;
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/sites");
    if (res.ok) {
      const { sites } = await res.json();
      setSites([...sites].sort((a, b) => riskScore(a) - riskScore(b)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Your sites</h1>
        <p className="text-sm text-neutral-500">Sorted by soonest risk. Down sites come first.</p>
      </div>

      <AddSiteForm onAdded={load} />

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : sites.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No sites yet. Add a client site above to start monitoring.
        </p>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
