import Stripe from "https://esm.sh/stripe@13.11.0?target=deno&deno-std=0.190.0";

const apiVersion = "2023-10-16";
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(stripeSecret, { apiVersion });
export const APP_URL = Deno.env.get("APP_URL") ?? "";
export const DEFAULT_SUCCESS_URL = APP_URL ? `${APP_URL}/success` : "https://example.com/success";
export const DEFAULT_CANCEL_URL = APP_URL ? `${APP_URL}/cancel` : "https://example.com/cancel";
export const STRIPE_TEST_PAYMENT_METHOD = Deno.env.get("STRIPE_TEST_PAYMENT_METHOD") ?? "";
