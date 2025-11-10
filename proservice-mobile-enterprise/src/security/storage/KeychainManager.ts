import Keychain from 'react-native-keychain';

class KeychainManager {
  private static serviceName = 'com.proservice.mobile';
  private static accessGroup = 'com.proservice.mobile.shared'; // Optionnel pour le partage entre apps

  static async initialize(): Promise<void> {
    console.log('🔐 Initializing Keychain Manager (iOS)');
    // Vérifier que Keychain est accessible
    try {
      await Keychain.getGenericPassword({ service: this.serviceName });
      console.log('✅ Keychain Manager initialized');
    } catch (error) {
      console.error('❌ Keychain initialization failed:', error);
      throw error;
    }
  }

  static async setItem(key: string, value: string, options: any = {}): Promise<void> {
    try {
      const result = await Keychain.setGenericPassword(key, value, {
        service: this.serviceName,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessGroup: this.accessGroup,
        ...options
      });

      if (!result) {
        throw new Error('Failed to store item in Keychain');
      }
    } catch (error) {
      console.error(`Keychain setItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.serviceName
      });
      
      if (credentials && credentials.username === key) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error(`Keychain getItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: this.serviceName });
    } catch (error) {
      console.error(`Keychain removeItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      // Supprimer tous les services Keychain de l'app
      const services = [this.serviceName];
      
      for (const service of services) {
        await Keychain.resetGenericPassword({ service });
      }
      
      console.log('✅ Keychain cleared successfully');
    } catch (error) {
      console.error('Keychain clear failed:', error);
      throw error;
    }
  }

  static async setItemWithBiometry(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        const result = await Keychain.setGenericPassword(key, value, {
          service: this.serviceName,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
        });

        if (!result) {
          throw new Error('Failed to store item in Keychain with biometry');
        }
      } else {
        // Fallback pour Android
        await this.setItem(key, value);
      }
    } catch (error) {
      console.error(`Keychain setItemWithBiometry failed for key: ${key}`, error);
      throw error;
    }
  }

  static async getSupportedBiometryType(): Promise<string | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType;
    } catch (error) {
      console.error('Failed to get supported biometry type:', error);
      return null;
    }
  }
}

export default KeychainManager;
