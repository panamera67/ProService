import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, parseJson } from "../shared/utils.ts";
import { stripe, DEFAULT_CANCEL_URL, DEFAULT_SUCCESS_URL } from "../shared/stripe.ts";

interface CreatePaymentIntentPayload {
  amount: number;
  projectId: string;
  userEmail?: string;
  currency?: string;
}

const sanitizeAmount = (amount: unknown): number => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid donation amount");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Amount must be expressed in the smallest currency unit (integer)");
  }

  return amount;
};

const sanitizeProjectId = (projectId: unknown): string => {
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    throw new Error("Invalid project identifier");
  }
  return projectId.trim();
};

const sanitizeEmail = (email: unknown): string | undefined => {
  if (typeof email === "undefined" || email === null) {
    return undefined;
  }

  if (typeof email !== "string") {
    throw new Error("Invalid email address");
  }

  const normalized = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("Invalid email address");
  }

  return normalized;
};

const sanitizeCurrency = (currency: unknown): string => {
  if (typeof currency === "string" && /^[a-zA-Z]{3}$/.test(currency)) {
    return currency.toLowerCase();
  }
  return "eur";
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const payload = await parseJson<CreatePaymentIntentPayload>(req);

    const amount = sanitizeAmount(payload.amount);
    const projectId = sanitizeProjectId(payload.projectId);
    const userEmail = sanitizeEmail(payload.userEmail);
    const currency = sanitizeCurrency(payload.currency);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        projectId,
        source: "mobile-app",
      },
      receipt_email: userEmail,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return jsonResponse(req, {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      nextAction: paymentIntent.next_action,
      amount,
      currency,
      successUrl: DEFAULT_SUCCESS_URL,
      cancelUrl: DEFAULT_CANCEL_URL,
    });
  } catch (error) {
    console.error("[create-payment-intent] error", error);

    const message =
      error instanceof Error ? error.message : "Une erreur est survenue";

    return jsonResponse(req, { error: message }, 500);
  }
});
