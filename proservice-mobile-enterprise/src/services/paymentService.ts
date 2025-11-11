import { supabase } from './supabase';

interface SupabaseFunctionResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface DonationIntent {
  id: string;
  clientSecret?: string;
  url?: string;
}

const normalizeAmount = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Montant de don invalide');
  }

  return Math.round(amount * 100);
};

const propagateError = (error: unknown, fallbackMessage: string): never => {
  if (error instanceof Error && error.message) {
    throw new Error(error.message);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? fallbackMessage);
    throw new Error(message);
  }

  throw new Error(fallbackMessage);
};

export class PaymentService {
  static async createDonationIntent(amount: number, projectId: string, userEmail: string): Promise<DonationIntent> {
    try {
      const normalizedAmount = normalizeAmount(amount);

      const response = (await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: normalizedAmount,
          projectId,
          userEmail
        }
      })) as SupabaseFunctionResponse<DonationIntent>;

      if (response.error) {
        propagateError(response.error, 'Erreur de traitement du paiement');
      }

      if (!response.data) {
        throw new Error('Réponse paiement invalide');
      }

      return response.data;
    } catch (error) {
      console.error('[PaymentService.createDonationIntent] error:', error);
      propagateError(error, 'Erreur de traitement du paiement');
    }
  }

  static async confirmDonation(paymentIntentId: string): Promise<DonationIntent> {
    try {
      if (!paymentIntentId) {
        throw new Error('Identifiant de paiement manquant');
      }

      const response = (await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId }
      })) as SupabaseFunctionResponse<DonationIntent>;

      if (response.error) {
        propagateError(response.error, 'Erreur de confirmation du paiement');
      }

      if (!response.data) {
        throw new Error('Réponse de confirmation invalide');
      }

      return response.data;
    } catch (error) {
      console.error('[PaymentService.confirmDonation] error:', error);
      propagateError(error, 'Erreur de confirmation du paiement');
    }
  }
}
