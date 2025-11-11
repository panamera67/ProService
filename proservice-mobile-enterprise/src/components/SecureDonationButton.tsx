import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle
} from 'react-native';
import { PaymentService } from '../services/paymentService';
import { ErrorHandler } from '../services/errorHandler';

interface SecureDonationButtonProps {
  projectId: string;
  projectName: string;
  userEmail: string;
  defaultAmounts?: number[];
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  onSuccess?: (payload: { amount: number; paymentIntentId: string }) => void;
}

const DEFAULT_AMOUNTS = [10, 25, 50, 100];

export const SecureDonationButton: React.FC<SecureDonationButtonProps> = ({
  projectId,
  projectName,
  userEmail,
  defaultAmounts = DEFAULT_AMOUNTS,
  containerStyle,
  titleStyle,
  onSuccess
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const formattedAmounts = useMemo(() => {
    return defaultAmounts
      .filter((amount) => Number.isFinite(amount) && amount > 0)
      .map((amount) => Math.round(amount));
  }, [defaultAmounts]);

  const resolveAmount = (): number | null => {
    if (selectedAmount && selectedAmount > 0) {
      return selectedAmount;
    }

    if (customAmount.trim().length === 0) {
      return null;
    }

    const value = parseFloat(customAmount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return Number(value.toFixed(2));
  };

  const resetState = () => {
    setSelectedAmount(null);
    setCustomAmount('');
  };

  const handleSecureDonation = async () => {
    const amount = resolveAmount();

    if (!amount) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    if (!userEmail) {
      Alert.alert('Erreur', 'Adresse e-mail utilisateur manquante');
      return;
    }

    setLoading(true);

    try {
      const paymentData = await ErrorHandler.safeAPIcall(
        () => PaymentService.createDonationIntent(amount, projectId, userEmail),
        'create-donation-intent'
      );

      console.log('Paiement sécurisé initié:', paymentData);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const confirmation = await ErrorHandler.safeAPIcall(
        () => PaymentService.confirmDonation(paymentData.id),
        'confirm-donation'
      );

      Alert.alert(
        'Don sécurisé réussi !',
        `Merci pour votre don de ${amount}€ pour ${projectName}`
      );

      if (onSuccess) {
        onSuccess({ amount, paymentIntentId: confirmation.id });
      }

      resetState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de sécurité';
      Alert.alert('Erreur de sécurité', message);
    } finally {
      setLoading(false);
    }
  };

  const resolvedAmountLabel = resolveAmount();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.title, titleStyle]}>Faire un don sécurisé</Text>

      <View style={styles.amounts}>
        {formattedAmounts.map((amount) => {
          const isSelected = selectedAmount === amount;
          return (
            <TouchableOpacity
              key={amount}
              style={[styles.amountButton, isSelected && styles.amountButtonSelected]}
              onPress={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
              disabled={loading}
            >
              <Text style={[styles.amountText, isSelected && styles.amountTextSelected]}>
                {amount}€
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.customLabel}>Ou montant personnalisé :</Text>
      <TextInput
        style={styles.customInput}
        placeholder="Montant en €"
        placeholderTextColor="#94a3b8"
        value={customAmount}
        onChangeText={(text) => {
          const sanitized = text.replace(/[^\d.,]/g, '');
          setCustomAmount(sanitized);
          setSelectedAmount(null);
        }}
        keyboardType="decimal-pad"
        maxLength={8}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.donateButton, (!resolvedAmountLabel || loading) && styles.donateButtonDisabled]}
        onPress={handleSecureDonation}
        disabled={!resolvedAmountLabel || loading}
      >
        <Text style={styles.donateButtonText}>
          {loading
            ? 'Traitement sécurisé...'
            : resolvedAmountLabel
            ? `Donner ${resolvedAmountLabel}€`
            : 'Sélectionnez un montant'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.securityNote}>🔒 Paiement 100% sécurisé</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center'
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  amountButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#1f2937',
    marginBottom: 8,
    alignItems: 'center'
  },
  amountButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6'
  },
  amountText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500'
  },
  amountTextSelected: {
    color: '#ffffff'
  },
  customLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8
  },
  customInput: {
    backgroundColor: '#1f2937',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 16
  },
  donateButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  donateButtonDisabled: {
    backgroundColor: '#16a34a88'
  },
  donateButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  },
  securityNote: {
    color: '#4ade80',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12
  }
});

export default SecureDonationButton;
