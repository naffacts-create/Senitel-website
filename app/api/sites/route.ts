import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCheck } from "@/lib/runCheck";
import { PLAN_LIMITS, type Plan } from "@/lib/types";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** GET /api/sites — list the current user's sites, soonest-risk first. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sites: data });
}

/** POST /api/sites — add a site (enforces plan limit), then runs first check. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user plan for rate limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, email")
    .eq("id", user.id)
    .single();
  const plan = (profile?.plan ?? "free") as Plan;

  // Apply rate limiting (free: 10/hour, pro: 30/hour)
  const rateLimitWindow = 60 * 60 * 1000; // 1 hour
  const rateLimitPerPlan = { free: 10, pro: 30 };
  const limit = rateLimitPerPlan[plan];
  const rateLimitKey = `add-site:${user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, limit, rateLimitWindow);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again after ${rateLimit.resetAt.toISOString()}`,
      },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { url?: string; name?: string } | null;
  const rawUrl = body?.url?.trim();
  if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  // Validate the URL early so we never store junk.
  let hostname: string;
  try {
    hostname = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname;
    if (!hostname) throw new Error("empty host");
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Enforce the plan limit.
  const { count } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= PLAN_LIMITS[plan]) {
    return NextResponse.json(
      { error: `Plan limit reached (${PLAN_LIMITS[plan]} sites). Upgrade to add more.` },
      { status: 402 },
    );
  }

  const { data: site, error } = await supabase
    .from("sites")
    .insert({ user_id: user.id, url: rawUrl, name: body?.name ?? hostname })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Run the first check immediately so the dashboard isn't empty.
  const email = profile?.email ?? user.email ?? "";
  try {
    await runCheck(supabase, site, email);
  } catch (err) {
    console.error("Initial check failed:", err);
  }

  // Re-read to return the populated snapshot.
  const { data: fresh } = await supabase.from("sites").select("*").eq("id", site.id).single();
  return NextResponse.json({ site: fresh ?? site }, { status: 201 });
}
