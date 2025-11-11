# ProService Mobile – Secure Donation Flow

This document describes how to run and deploy the secure donation flow that integrates Stripe payments with Supabase Edge Functions for the Solar Concept initiative.

## Overview

- Mobile app uses `@supabase/supabase-js` to fetch projects and invoke secure Edge Functions.
- Stripe Payment Intents are created server-side via Supabase functions to keep secrets outside the client.
- A hardened error handler surfaces end-user friendly messages while preserving observability in logs.
- Supabase Row Level Security (RLS) enforces access control for donation data.

## Environment Variables

Configure the following variables before building the mobile app or deploying the backend:

| Variable | Purpose | Where to set |
|----------|---------|--------------|
| `EXPO_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` | Supabase project URL | Mobile app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` | Supabase anonymous key | Mobile app |
| `STRIPE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key used by the mobile client | Mobile app |
| `STRIPE_SECRET_KEY` | Secret key used by Supabase Edge Functions to talk to Stripe | Supabase secrets |
| `APP_URL` | Public URL of your frontend for Stripe redirects | Supabase secrets |
| `STRIPE_TEST_PAYMENT_METHOD` (optional) | Test payment method ID (`pm_card_visa`) for automated confirmations during QA | Supabase secrets |

> ℹ️ **React Native / Expo** – make sure environment variables are available at build time (e.g. `app.config.js`, `expo-config`, or `react-native-config`).

## Supabase Edge Functions

The repository ships with two Edge Functions under `supabase/functions`:

- `create-payment-intent`: validates donation payloads and returns a Stripe Payment Intent client secret.
- `confirm-payment`: retrieves or finalises a Payment Intent to confirm the donation outcome.

### Deploy

```bash
supabase functions deploy create-payment-intent
supabase functions deploy confirm-payment
```

### Configure Secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set APP_URL=https://your-app.com
supabase secrets set STRIPE_TEST_PAYMENT_METHOD=pm_card_visa  # optional
```

## Database Security

Apply the recommended RLS policies in the Supabase SQL editor:

```sql
ALTER TABLE solar_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view projects" ON solar_projects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can donate" ON donations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users see own donations" ON donations
  FOR SELECT USING (auth.uid() = user_id);
```

## Mobile Integration

- Use `SecureDonationButton` from `src/components/SecureDonationButton.tsx` to trigger a protected donation flow.
- `PaymentService` (under `src/services`) abstracts Supabase function calls and amount sanitisation.
- `ErrorHandler` unifies network and payment error messaging.

### Quick Usage

```tsx
import SecureDonationButton from '../components/SecureDonationButton';

<SecureDonationButton
  projectId={project.id}
  projectName={project.name}
  userEmail={currentUser.email}
  onSuccess={({ amount, paymentIntentId }) => {
    console.log('Donation confirmed', amount, paymentIntentId);
  }}
/>;
```

## Testing Checklist

- [ ] Run `npm install` (or `yarn`) inside `proservice-mobile-enterprise/`.
- [ ] Provide environment variables via `.env`, `app.config.js`, or native build tooling.
- [ ] Use Stripe test cards to validate the flow (`4242 4242 4242 4242`).
- [ ] Monitor Supabase Edge Function logs (`supabase functions logs <name>`).

## Deployment Recap

1. Configure Supabase secrets (`STRIPE_SECRET_KEY`, `APP_URL`, optional test payment method).
2. Deploy `create-payment-intent` and `confirm-payment`.
3. Apply database RLS policies.
4. Rebuild the mobile app with publishable keys and Supabase credentials.
5. Verify transactions in the Stripe dashboard (test mode first, then live).
