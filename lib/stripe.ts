import Stripe from "stripe";

// Lazily constructed so the build (which has no env vars) doesn't throw.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

/** Creates a Checkout session for the Pro subscription. */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  customerId?: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.email }),
    client_reference_id: params.userId,
    metadata: { userId: params.userId },
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/dashboard`,
  });
}
