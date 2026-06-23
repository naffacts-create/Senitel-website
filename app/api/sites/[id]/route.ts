import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCheck } from "@/lib/runCheck";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/** DELETE /api/sites/:id — remove a site (RLS ensures ownership). */
export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("sites").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** POST /api/sites/:id — re-run checks on demand. */
export async function POST(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: site } = await supabase
    .from("sites")
    .select("id, url")
    .eq("id", params.id)
    .single();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await runCheck(supabase, site, user.email ?? "");
  const { data: fresh } = await supabase.from("sites").select("*").eq("id", params.id).single();
  return NextResponse.json({ site: fresh });
}
