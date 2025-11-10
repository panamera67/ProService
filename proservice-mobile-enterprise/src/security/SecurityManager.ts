import { Platform } from 'react-native';
import KeychainManager from './storage/KeychainManager';
import KeystoreManager from './storage/KeystoreManager';
import SSLPinningService from './network/SSLPinningInterceptor';
import BiometricAuth from './auth/BiometricAuth';
import EncryptionService from './storage/EncryptionService';
import AppIntegrityService from './integrity/AppIntegrityService';
import TamperDetection from './integrity/TamperDetection';

class SecurityManager {
  private static instance: SecurityManager;
  private isInitialized = false;
  private securityConfig = {
    maxRetryAttempts: 3,
    lockoutDuration: 300000, // 5 minutes
    emergencyLockdown: false
  };

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔐 Initializing Security Manager...');

      // 1. Détection de tampering
      if (await TamperDetection.isDeviceCompromised()) {
        throw new Error('Device security compromised');
      }

      // 2. SSL Pinning
      await SSLPinningService.initialize();

      // 3. Vérification intégrité app
      const isAppValid = await AppIntegrityService.verifyAppIntegrity();
      if (!isAppValid) {
        await this.emergencyLockdown();
        throw new Error('App integrity check failed');
      }

      // 4. Initialisation chiffrement
      await EncryptionService.initialize();

      // 5. Initialisation stockage sécurisé
      if (Platform.OS === 'ios') {
        await KeychainManager.initialize();
      } else {
        await KeystoreManager.initialize();
      }

      this.isInitialized = true;
      console.log('✅ Security Manager initialized successfully');
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      await this.emergencyLockdown();
      throw error;
    }
  }

  async secureStorage<T>(key: string, value?: T): Promise<T | null> {
    await this.ensureInitialized();

    try {
      if (value !== undefined) {
        // Stockage chiffré
        const encrypted = await EncryptionService.encrypt(JSON.stringify(value));
        if (Platform.OS === 'ios') {
          await KeychainManager.setItem(key, encrypted);
        } else {
          await KeystoreManager.setItem(key, encrypted);
        }
        return value;
      } else {
        // Récupération déchiffrée
        let encrypted: string | null;
        if (Platform.OS === 'ios') {
          encrypted = await KeychainManager.getItem(key);
        } else {
          encrypted = await KeystoreManager.getItem(key);
        }
        
        if (!encrypted) return null;
        
        const decrypted = await EncryptionService.decrypt(encrypted);
        return JSON.parse(decrypted);
      }
    } catch (error) {
      console.error(`Secure storage operation failed for key: ${key}`, error);
      throw error;
    }
  }

  async withSecurity<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureInitialized();

    try {
      return await operation();
    } catch (error) {
      if (this.isSecurityBreach(error)) {
        await this.emergencyLockdown();
      }
      throw error;
    }
  }

  async enableBiometricAuth(): Promise<boolean> {
    return await BiometricAuth.isAvailable();
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    return await BiometricAuth.authenticate();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private isSecurityBreach(error: any): boolean {
    const securityErrors = [
      'CERTIFICATE_MISMATCH',
      'INTEGRITY_FAILURE',
      'TAMPER_DETECTED',
      'UNAUTHORIZED_ACCESS'
    ];
    
    return securityErrors.some(securityError => 
      error?.message?.includes(securityError)
    );
  }

  private async emergencyLockdown(): Promise<void> {
    console.warn('🚨 EMERGENCY LOCKDOWN ACTIVATED');
    
    this.securityConfig.emergencyLockdown = true;

    // Effacer toutes les données sensibles
    try {
      if (Platform.OS === 'ios') {
        await KeychainManager.clear();
      } else {
        await KeystoreManager.clear();
      }
      await EncryptionService.clearKeys();
    } catch (error) {
      console.error('Failed to clear secure data:', error);
    }

    // TODO: Naviguer vers écran de sécurité
    // navigation.navigate('SecurityBreach');
    
    throw new Error('Security breach detected. Application locked.');
  }

  getSecurityStatus() {
    return {
      initialized: this.isInitialized,
      lockdown: this.securityConfig.emergencyLockdown,
      platform: Platform.OS,
      biometrics: BiometricAuth.isAvailable()
    };
  }
}

export default SecurityManager.getInstance();
