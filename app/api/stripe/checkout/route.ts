import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

/** POST /api/stripe/checkout — start a Pro subscription Checkout. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const session = await createCheckoutSession({
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    customerId: profile?.stripe_customer_id,
  });

  return NextResponse.json({ url: session.url });
}
