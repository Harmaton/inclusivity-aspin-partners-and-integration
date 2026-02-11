import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';

@Injectable()
export class MpesaGateway {
  private readonly logger = new Logger(MpesaGateway.name);
  private readonly timeoutThreshold = parseInt(
    process.env.PAYMENT_TIMEOUT_MS || '5000',
  );
  private readonly failureRate = parseFloat(
    process.env.SIMULATE_FAILURE_RATE || '0.2',
  ); // 20% failure

  /**
   * Simulates M-Pesa Daraja API integration
   * Implements assignment requirements:
   * - 20% simulated failure rate (configurable)
   * - Timeout simulation (ETIMEDOUT)
   * - Realistic transaction ID format
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(
      `Initiating M-Pesa payment: policy=${dto.policy_code}, phone=${dto.msisdn}`,
    );

    // SIMULATE: Random timeout (20% chance)
    if (Math.random() < this.failureRate) {
      this.logger.warn(
        `SIMULATED TIMEOUT: M-Pesa gateway unresponsive for policy ${dto.policy_code}`,
      );
      throw new ServiceUnavailableException({
        error: 'GatewayTimeout',
        message: 'M-Pesa gateway temporarily unavailable',
        details: {
          provider: 'mpesa',
          timeout_ms: this.timeoutThreshold,
          simulated: true,
        },
      });
    }

    // SIMULATE: Network delay (realistic API call)
    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 700),
    );

    // Generate PaymentHub-style transaction ID (for internal mapping)
    const paymentHubTxnId = `MPESA_LNMO_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    this.logger.log(
      `M-Pesa payment initiated successfully: hub_tx=${paymentHubTxnId}, aspin_ref=${dto.aspin_reference}`,
    );

    return {
      transaction_id: paymentHubTxnId, // Internal PaymentHub ID (mapped to ASPIN ID in service)
      status: 'pending',
      amount: dto.amount_in_cents,
      currency: dto.currency,
      provider: 'mpesa',
      timestamp: new Date().toISOString(),
      policy_id: dto.policy_code,
      message: 'Customer prompt sent via SMS. Awaiting confirmation.',
    };
  }
}
