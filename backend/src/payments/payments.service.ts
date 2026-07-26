import { Injectable, Logger } from '@nestjs/common';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async createPayment(montant: number, devise: string, commandeId: string, clientEmail: string): Promise<PaymentResult> {
    // TODO: Intégrer Stripe / mobile money (Wave, Orange Money)
    // En attendant un vrai prestataire, on simule un temps de traitement réseau
    // et un taux d'échec réaliste (carte refusée, solde insuffisant, etc.).
    this.logger.log(`[MOCK] Paiement de ${montant} ${devise} pour commande ${commandeId}`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (Math.random() < 0.15) {
      return { success: false, error: 'Paiement refusé par le simulateur (solde insuffisant).' };
    }
    return { success: true, transactionId: `mock_${commandeId || 'sim'}_${Date.now()}` };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    this.logger.log(`[MOCK] Vérification paiement ${transactionId}`);
    return { success: true, transactionId };
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // TODO: Valider la signature du PSP et mettre à jour la commande
    this.logger.log('[MOCK] Webhook reçu');
  }
}
