import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;
  private keyDerivationSalt = 'proservice-mobile-salt-2024';

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.encryptionKey) return;

    try {
      // Générer ou récupérer une clé de chiffrement
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      console.log('✅ Encryption Service initialized');
    } catch (error) {
      console.error('❌ Encryption Service initialization failed:', error);
      throw error;
    }
  }

  async encrypt(data: string): Promise<string> {
    await this.ensureInitialized();

    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey!).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('ENCRYPTION_FAILED');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    await this.ensureInitialized();

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey!);
      const originalText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
        throw new Error('DECRYPTION_FAILED: Invalid encrypted data');
      }
      
      return originalText;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('DECRYPTION_FAILED');
    }
  }

  async clearKeys(): Promise<void> {
    this.encryptionKey = null;
    
    // Effacer la clé du stockage sécurisé
    try {
      if (Platform.OS === 'ios') {
        const { default: KeychainManager } = await import('./KeychainManager');
        await KeychainManager.removeItem('encryption_key');
      } else {
        const { default: KeystoreManager } = await import('./KeystoreManager');
        await KeystoreManager.removeItem('encryption_key');
      }
    } catch (error) {
      console.error('Failed to clear encryption keys:', error);
    }
  }

  private async getOrCreateEncryptionKey(): Promise<string> {
    let existingKey: string | null = null;

    // Essayer de récupérer la clé existante
    try {
      if (Platform.OS === 'ios') {
        const { default: KeychainManager } = await import('./KeychainManager');
        existingKey = await KeychainManager.getItem('encryption_key');
      } else {
        const { default: KeystoreManager } = await import('./KeystoreManager');
        existingKey = await KeystoreManager.getItem('encryption_key');
      }
    } catch (error) {
      console.warn('No existing encryption key found, generating new one...');
    }

    if (existingKey) {
      return existingKey;
    }

    // Générer une nouvelle clé
    const newKey = this.generateEncryptionKey();
    
    // Stocker la nouvelle clé de manière sécurisée
    try {
      if (Platform.OS === 'ios') {
        const { default: KeychainManager } = await import('./KeychainManager');
        await KeychainManager.setItem('encryption_key', newKey);
      } else {
        const { default: KeystoreManager } = await import('./KeystoreManager');
        await KeystoreManager.setItem('encryption_key', newKey);
      }
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw new Error('ENCRYPTION_KEY_STORAGE_FAILED');
    }

    return newKey;
  }

  private generateEncryptionKey(): string {
    // Générer une clé de 256 bits (32 bytes)
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    const key = CryptoJS.enc.Base64.stringify(randomBytes);
    
    // Dériver la clé avec PBKDF2 pour plus de sécurité
    const derivedKey = CryptoJS.PBKDF2(key, this.keyDerivationSalt, {
      keySize: 256 / 32,
      iterations: 10000
    });
    
    return CryptoJS.enc.Base64.stringify(derivedKey);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.encryptionKey) {
      await this.initialize();
    }
  }

  // Utilitaires de hachage
  static hashData(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  static generateHMAC(data: string, key: string): string {
    return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Hex);
  }
}

export default EncryptionService.getInstance();
