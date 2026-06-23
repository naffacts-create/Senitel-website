import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runCheck } from "@/lib/runCheck";

export const runtime = "nodejs";
// Allow up to 60s on Vercel (Hobby cap) for the sweep.
export const maxDuration = 60;

/**
 * Daily sweep. Vercel Cron calls this and includes
 * `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Join each site to its owner's email so alerts know where to go.
  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, url, user_id, profiles(email)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let checked = 0;
  let failed = 0;
  for (const site of sites ?? []) {
    const email =
      (site as { profiles?: { email?: string } }).profiles?.email ?? "";
    try {
      await runCheck(supabase, { id: site.id, url: site.url }, email);
      checked++;
    } catch (err) {
      failed++;
      console.error(`Check failed for site ${site.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, checked, failed });
}
