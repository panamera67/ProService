type ErrorCategory = 'network' | 'payment' | 'auth' | 'default';

const DEFAULT_ERROR_MAP: Record<ErrorCategory, string> = {
  network: 'Erreur réseau. Vérifiez votre connexion.',
  payment: 'Erreur de paiement. Réessayez ou contactez le support.',
  auth: "Erreur d'authentification. Reconnectez-vous.",
  default: 'Une erreur est survenue. Réessayez.'
};

const resolveErrorType = (error: unknown): ErrorCategory => {
  if (!error || typeof error !== 'object') {
    return 'default';
  }

  if ('type' in error && typeof (error as { type?: string }).type === 'string') {
    const type = (error as { type?: string }).type as ErrorCategory;
    if (type === 'network' || type === 'payment' || type === 'auth') {
      return type;
    }
  }

  if (error instanceof Error && error.message.toLowerCase().includes('paiement')) {
    return 'payment';
  }

  return 'default';
};

export class ErrorHandler {
  static handleAPIError(error: unknown, context: string): string {
    console.error(`[${context}] Error:`, error);

    const type = resolveErrorType(error);
    const message = DEFAULT_ERROR_MAP[type] ?? DEFAULT_ERROR_MAP.default;

    if (type === 'default' && error instanceof Error && error.message) {
      return error.message;
    }

    return message;
  }

  static async safeAPIcall<T>(apiCall: () => Promise<T>, context: string): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      const userMessage = this.handleAPIError(error, context);
      throw new Error(userMessage);
    }
  }
}
