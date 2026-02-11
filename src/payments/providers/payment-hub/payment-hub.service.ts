import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InitiatePaymentDto } from '../../dto/initiate-payment.dto';
import { PaymentResponseDto } from '../../dto/payment-response.dto';

@Injectable()
export class PaymentHubService {
  private readonly logger = new Logger(PaymentHubService.name);
  private readonly simulateFailureRate = parseFloat(
    process.env.SIMULATE_FAILURE_RATE || '0.1',
  ); // 10% failure rate

  /**
   * Simulates calling PaymentHub API (replaces Mpesa/Airtel gateways)
   * Returns mock response exactly as specified in assignment
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(
      `Calling PaymentHub API: provider=${dto.provider}, amount=${dto.amount_in_cents}`,
    );

    // SIMULATE: Random network timeout (10% chance)
    if (Math.random() < this.simulateFailureRate) {
      this.logger.error('SIMULATED PAYMENTHUB TIMEOUT');
      throw new ServiceUnavailableException({
        error: 'GatewayTimeout',
        message: 'PaymentHub gateway temporarily unavailable',
        details: { provider: dto.provider, timeout_ms: 5000 },
      });
    }

    // SIMULATE: Network delay (realistic API call)
    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 700),
    );

    // Generate mock PaymentHub transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Return EXACT mock response format from assignment
    const response: PaymentResponseDto = {
      message: '',
      policy_id: '',
      provider: '',
      transaction_id: transactionId,
      status: 'pending',
      amount: dto.amount_in_cents,
      currency: dto.currency,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`PaymentHub response: ${JSON.stringify(response)}`);
    return response;
  }
}
