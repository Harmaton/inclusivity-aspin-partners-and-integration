import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';

// Simple interface for in-memory storage (no DB)
interface PaymentTransaction {
  aspin_transaction_id: string;
  payment_hub_transaction_id: string;
  policy_code: string;
  amount: number;
  currency: string;
  provider: string;
  msisdn: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000; // 1 second between retries
  // In-memory store (simple Map)
  private transactions = new Map<string, PaymentTransaction>();

  constructor(private readonly paymentHubService: PaymentHubService) {}

  /**
   * INITIATE PAYMENT FLOW
   * 1. Validate amount is exactly KES 5,000
   * 2. Check duplicate transaction (by policy_code in unique customer)
   * 3. Forward to PaymentHub API
   * 4. Store transaction
   * 4.1 send transaction reference to ASPin
   * 5. Return PaymentHub response
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    /**
     * VALIDATION 2: Duplicate check (by policy_code + msisdn pair)
     * Prevents same customer from initiating duplicate payments for same policy
     * Allows retries for FAILED transactions (customer can retry after failure)
     */
    const existingTransaction = Array.from(this.transactions.values()).find(
      (txn) =>
        txn.policy_code === dto.policy_code &&
        txn.msisdn === dto.msisdn &&
        (txn.status === 'pending' || txn.status === 'completed'),
    );

    if (existingTransaction) {
      this.logger.warn(
        `DUPLICATE TRANSACTION: Policy ${dto.policy_code} + MSISDN ${dto.msisdn} already has active payment`,
      );
      throw new ConflictException({
        error: 'DuplicateTransaction',
        message: 'Payment already initiated for this policy and customer',
        details: {
          existing_transaction_id: existingTransaction.aspin_transaction_id,
          policy_code: dto.policy_code,
          msisdn: dto.msisdn,
          status: existingTransaction.status,
          initiated_at: existingTransaction.created_at,
        },
      });
    }

    this.logger.log(
      `INITIATING PAYMENT: policy=${dto.policy_code}, provider=${dto.provider}`,
    );

    // FORWARD TO PAYMENT-HUB API WITH RETRY LOGIC
    let paymentHubResponse: PaymentResponseDto | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(`PaymentHub attempt ${attempt}/${this.MAX_RETRIES}`);

        paymentHubResponse =
          await this.paymentHubService.initiatePaymentHub(dto);

        // SUCCESS: PaymentHub returned valid response
        if (paymentHubResponse) {
          this.logger.log(`PaymentHub successful on attempt ${attempt}`);
          break;
        }

        // PaymentHub returned null (unexpected failure)
        this.logger.error(`PaymentHub returned null on attempt ${attempt}`);
        lastError = new Error('PaymentHub returned null response');

      } catch (error) {
        lastError = error as Error;
        this.logger.error(`PaymentHub attempt ${attempt} failed`);

        // Don't retry on validation errors (4xx)
        if (error instanceof BadRequestException) {
          this.logger.warn('Validation error - not retrying');
          throw error; // Re-throw immediately
        }

        // Retry delay (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // ALL RETRIES EXHAUSTED OR NULL RESPONSE
    if (!paymentHubResponse) {
      const errorMessage =
        lastError?.message || 'PaymentHub service unavailable';

      this.logger.error(
        `PAYMENT FAILED: All ${this.MAX_RETRIES} retries exhausted. Last error: ${errorMessage}`,
      );

      // THROW 500 ERROR WITH DETAILS
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      throw new HttpException(
        {
          error: 'PaymentProcessingFailed',
          message: 'Failed to process payment after multiple attempts',
          details: {
            policy_code: dto.policy_code,
            provider: dto.provider,
            retries_attempted: this.MAX_RETRIES,
            last_error: errorMessage,
            timestamp: new Date().toISOString(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR, // 500
      );
    }

    // STORE TRANSACTION (in-memory)
    const transaction: PaymentTransaction = {
      aspin_transaction_id: `TXN_ASPIN_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      payment_hub_transaction_id: paymentHubResponse.transaction_id,
      policy_code: dto.policy_code,
      amount: dto.amount_in_cents,
      currency: dto.currency,
      provider: dto.provider,
      msisdn: dto.msisdn,
      status: paymentHubResponse.status,
      created_at: paymentHubResponse.timestamp,
      updated_at: paymentHubResponse.timestamp,
    };

    this.transactions.set(transaction.aspin_transaction_id, transaction);

    this.logger.log(
      `PAYMENT INITIATED: aspin_tx=${transaction.aspin_transaction_id}, hub_tx=${paymentHubResponse.transaction_id}`,
    );

    // returned transaction reference to ASPin
    return paymentHubResponse;
  }
}



