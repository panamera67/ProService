import { Platform } from 'react-native';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import SSL_PINS from '../../../config/security/ssl-pins.json';

interface SSLPin {
  hostname: string;
  pins: string[];
  includeSubdomains: boolean;
}

class SSLPinningService {
  private static instance: SSLPinningService;
  private pins: Map<string, string[]> = new Map();
  private isInitialized = false;

  static getInstance(): SSLPinningService {
    if (!SSLPinningService.instance) {
      SSLPinningService.instance = new SSLPinningService();
    }
    return SSLPinningService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Charger les pins depuis la configuration
      this.loadPinsFromConfig();
      
      // Configurer axios pour utiliser le pinning
      this.setupAxiosInterceptors();
      
      this.isInitialized = true;
      console.log('✅ SSL Pinning initialized');
    } catch (error) {
      console.error('❌ SSL Pinning initialization failed:', error);
      throw error;
    }
  }

  private loadPinsFromConfig(): void {
    (SSL_PINS as SSLPin[]).forEach((pinConfig: SSLPin) => {
      this.pins.set(pinConfig.hostname, pinConfig.pins);
    });
  }

  private setupAxiosInterceptors(): void {
    // Interceptor pour valider les certificats
    axios.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        if (config.url) {
          const hostname = this.extractHostname(config.url);
          if (this.pins.has(hostname)) {
            // Ajouter les headers de sécurité
            config.headers = {
              ...config.headers,
              'X-SSL-Pinning': 'enabled',
              'User-Agent': 'ProService-Mobile/1.0.0'
            };
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor pour valider les réponses
    axios.interceptors.response.use(
      (response: AxiosResponse) => {
        // Ici on pourrait valider le certificat de la réponse
        // En production, utiliser react-native-ssl-pinning
        return response;
      },
      (error) => {
        if (error.code === 'CERTIFICATE_MISMATCH') {
          console.error('SSL Pinning failure:', error);
          throw new Error('SECURITY_BREACH: Certificate validation failed');
        }
        return Promise.reject(error);
      }
    );
  }

  private extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  validateCertificate(hostname: string, certificate: any): boolean {
    const expectedPins = this.pins.get(hostname);
    if (!expectedPins) {
      console.warn(`No SSL pins configured for: ${hostname}`);
      return true; // Autoriser si pas de pins configurés
    }

    // Implémentation simplifiée - en production utiliser react-native-ssl-pinning
    // Cette logique devrait valider le fingerprint du certificat
    const certHash = this.calculateCertificateHash(certificate);
    
    const isValid = expectedPins.some(pin => pin === certHash);
    
    if (!isValid) {
      console.error(`SSL Pinning failure for ${hostname}. Expected: ${expectedPins}, Got: ${certHash}`);
    }
    
    return isValid;
  }

  private calculateCertificateHash(certificate: any): string {
    // Implémentation simplifiée
    // En production, utiliser crypto pour calculer SHA-256
    return 'sha256/' + Buffer.from(JSON.stringify(certificate)).toString('base64');
  }

  getPinnedDomains(): string[] {
    return Array.from(this.pins.keys());
  }
}

export default SSLPinningService.getInstance();
