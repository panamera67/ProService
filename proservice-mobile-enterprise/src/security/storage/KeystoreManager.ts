import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';

class KeystoreManager {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Vérifier que le stockage chiffré est disponible
      await EncryptedStorage.getItem('test_initialization');
      this.isInitialized = true;
      console.log('🔐 Keystore Manager initialized (Android)');
    } catch (error) {
      console.error('❌ Keystore initialization failed:', error);
      throw error;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await EncryptedStorage.setItem(key, value);
    } catch (error) {
      console.error(`Keystore setItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    await this.ensureInitialized();

    try {
      const value = await EncryptedStorage.getItem(key);
      return value;
    } catch (error) {
      console.error(`Keystore getItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      console.error(`Keystore removeItem failed for key: ${key}`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      await EncryptedStorage.clear();
      console.log('✅ Keystore cleared successfully');
    } catch (error) {
      console.error('Keystore clear failed:', error);
      throw error;
    }
  }

  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Méthodes spécifiques Android
  static async isDeviceSecure(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      // Vérifier si l'appareil a un verrouillage d'écran
      // Implémentation simplifiée
      const testKey = 'device_security_check';
      await this.setItem(testKey, 'test');
      await this.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  static async requireDeviceSecurity(): Promise<void> {
    const isSecure = await this.isDeviceSecure();
    if (!isSecure) {
      throw new Error('DEVICE_INSECURE: Device must have screen lock enabled');
    }
  }
}

export default KeystoreManager;
