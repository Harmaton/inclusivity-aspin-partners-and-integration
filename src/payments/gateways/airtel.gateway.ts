import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';

@Injectable()
export class AirtelGateway {
  private readonly logger = new Logger(AirtelGateway.name);
  private readonly timeoutThreshold = parseInt(
    process.env.PAYMENT_TIMEOUT_MS || '5000',
  );
  private readonly failureRate = parseFloat(
    process.env.SIMULATE_FAILURE_RATE || '0.15',
  ); // 15% failure

  /**
   * Simulates Airtel Money API integration
   * Implements assignment requirements:
   * - Configurable failure simulation
   * - Realistic transaction ID format per Airtel docs
   * - Provider-specific error messages
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(
      `Initiating Airtel Money payment: policy=${dto.policy_code}, phone=${dto.msisdn}`,
    );

    // SIMULATE: Random timeout (15% chance)
    if (Math.random() < this.failureRate) {
      this.logger.warn(
        `SIMULATED TIMEOUT: Airtel gateway unresponsive for policy ${dto.policy_code}`,
      );
      throw new ServiceUnavailableException({
        error: 'GatewayTimeout',
        message: 'Airtel Money gateway temporarily unavailable',
        details: {
          provider: 'airtel',
          timeout_ms: this.timeoutThreshold,
          simulated: true,
        },
      });
    }

    // SIMULATE: Network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 400 + Math.random() * 600),
    );

    // Generate PaymentHub-style transaction ID (Airtel format)
    const paymentHubTxnId = `AIRTEL_TXN_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    this.logger.log(
      `Airtel payment initiated successfully: hub_tx=${paymentHubTxnId}, aspin_ref=${dto.aspin_reference}`,
    );

    return {
      transaction_id: paymentHubTxnId, // Internal PaymentHub ID
      status: 'pending',
      amount: dto.amount_in_cents,
      currency: dto.currency,
      provider: 'airtel',
      timestamp: new Date().toISOString(),
      policy_id: dto.policy_code,
      message: 'Customer prompt sent via USSD. Awaiting confirmation.',
    };
  }
}
