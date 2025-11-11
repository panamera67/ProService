import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, parseJson } from "../shared/utils.ts";
import { stripe, STRIPE_TEST_PAYMENT_METHOD } from "../shared/stripe.ts";

interface ConfirmPaymentPayload {
  paymentIntentId: string;
}

const sanitizePaymentIntentId = (paymentIntentId: unknown): string => {
  if (typeof paymentIntentId !== "string" || paymentIntentId.trim().length === 0) {
    throw new Error("Missing payment intent identifier");
  }

  return paymentIntentId.trim();
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const payload = await parseJson<ConfirmPaymentPayload>(req);
    const paymentIntentId = sanitizePaymentIntentId(payload.paymentIntentId);

    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    if (
      paymentIntent.status === "requires_confirmation" &&
      STRIPE_TEST_PAYMENT_METHOD
    ) {
      paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: STRIPE_TEST_PAYMENT_METHOD,
      });
    }

    if (
      paymentIntent.status !== "succeeded" &&
      paymentIntent.status !== "processing" &&
      paymentIntent.status !== "requires_capture"
    ) {
      throw new Error(`Payment intent ${paymentIntentId} is not completed`);
    }

    return jsonResponse(req, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      latestCharge: paymentIntent.latest_charge,
    });
  } catch (error) {
    console.error("[confirm-payment] error", error);

    const message = error instanceof Error ? error.message : "Une erreur est survenue";
    return jsonResponse(req, { error: message }, 500);
  }
});
