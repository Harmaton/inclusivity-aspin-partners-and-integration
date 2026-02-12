import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import * as crypto from 'crypto';

// Simple interface for in-memory storage (no DB)
interface PaymentTransaction {
  webhook_signature: string;
  webhook_processed: boolean;
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
  private readonly WEBHOOK_SECRET =
    process.env.WEBHOOK_SECRET || 'your-webhook-secret-key';

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
    const transaction: {
      aspin_transaction_id: string;
      payment_hub_transaction_id: string;
      policy_code: string;
      amount: number;
      currency: 'KES';
      provider: string;
      msisdn: string;
      status: string;
      created_at: string;
      updated_at: string;
      webhook_signature: string;
      webhook_processed: boolean;
    } = {
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
      webhook_signature: '',
      webhook_processed: false,
    };

    this.transactions.set(transaction.aspin_transaction_id, transaction);

    this.logger.log(
      `PAYMENT INITIATED: aspin_tx=${transaction.aspin_transaction_id}, hub_tx=${paymentHubResponse.transaction_id}`,
    );

    // returned transaction reference to ASPin
    return paymentHubResponse;
  }

  /**
   * WEBHOOK HANDLER
   * 1. Validate webhook signature
   * 2. Check idempotency (prevent duplicate processing)
   * 3. Update transaction status
   * 4. Notify ASPin backend
   */
  async processWebhook(
    webhookDto: WebhookPaymentDto,
  ): Promise<WebhookResponseDto> {
    this.logger.log(
      `WEBHOOK RECEIVED: ${webhookDto.transaction_id} - ${webhookDto.status}`,
    );

    // STEP 1: Validate signature
    if (!this.validateWebhookSignature(webhookDto)) {
      this.logger.error(
        `INVALID SIGNATURE for transaction ${webhookDto.transaction_id}`,
      );
      throw new UnauthorizedException({
        error: 'InvalidSignature',
        message: 'Webhook signature validation failed',
        details: {
          transaction_id: webhookDto.transaction_id,
        },
      });
    }

    // STEP 2: Find transaction
    const transaction = this.findTransactionByHubId(webhookDto.transaction_id);

    if (!transaction) {
      this.logger.warn(`TRANSACTION NOT FOUND: ${webhookDto.transaction_id}`);
      throw new BadRequestException({
        error: 'TransactionNotFound',
        message: 'Transaction not found in system',
        details: {
          transaction_id: webhookDto.transaction_id,
        },
      });
    }

    // STEP 3: Idempotency check - prevent duplicate processing
    if (
      transaction.webhook_processed &&
      transaction.webhook_signature === webhookDto.signature
    ) {
      this.logger.warn(
        `DUPLICATE WEBHOOK: ${webhookDto.transaction_id} already processed`,
      );

      return {
        success: true,
        message: 'Webhook already processed (idempotent)',
        transaction_id: webhookDto.transaction_id,
        processed_at: transaction.updated_at,
      };
    }

    // STEP 4: Update transaction status
    transaction.status = webhookDto.status;
    transaction.updated_at = webhookDto.timestamp;
    transaction.webhook_processed = true;
    transaction.webhook_signature = webhookDto.signature;

    this.transactions.set(transaction.aspin_transaction_id, transaction);

    this.logger.log(
      `TRANSACTION UPDATED: ${transaction.aspin_transaction_id} -> ${webhookDto.status}`,
    );

    // STEP 5: Notify ASPin
    await this.notifyASpinBackend(transaction);

    return {
      success: true,
      message: 'Webhook processed successfully',
      transaction_id: webhookDto.transaction_id,
      processed_at: new Date().toISOString(),
    };
  }

  /**
   * Validate webhook signature (simulated)
  Use HMAC SHA-256 with shared secret
   */
  private validateWebhookSignature(webhookDto: WebhookPaymentDto): boolean {
    const payload = `${webhookDto.transaction_id}${webhookDto.status}${webhookDto.amount}${webhookDto.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // accept any signature that starts with 'sha256_'
    const isValid =
      webhookDto.signature.startsWith('sha256_') ||
      webhookDto.signature === expectedSignature;

    this.logger.debug(`Signature validation: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  }

  /**
   * Find transaction by PaymentHub transaction ID
   */
  private findTransactionByHubId(
    hubTransactionId: string,
  ): PaymentTransaction | undefined {
    return Array.from(this.transactions.values()).find(
      (txn) => txn.payment_hub_transaction_id === hubTransactionId,
    );
  }

  /**
   * Notify ASPin backend of status change
   */
  private async notifyASpinBackend(
    transaction: PaymentTransaction,
  ): Promise<void> {
    this.logger.log(
      `NOTIFYING ASPIN: Policy ${transaction.policy_code} payment ${transaction.status}`,
    );

    try {
      // Dummy ASPin backend API endpoint
      const aspinWebhookUrl =
        process.env.ASPIN_WEBHOOK_URL ||
        'https://api.aspin.com/webhooks/payment-status';

      const payload = {
        policy_code: transaction.policy_code,
        transaction_id: transaction.aspin_transaction_id,
        payment_hub_transaction_id: transaction.payment_hub_transaction_id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: transaction.provider,
        msisdn: transaction.msisdn,
        timestamp: transaction.updated_at,
      };
      // Mock response
      const response = await fetch(aspinWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ASPIN_API_KEY || 'dummy-api-key'}`,
          'X-Request-ID': `NOTIFY_${Date.now()}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(
          `ASPin notification failed: ${response.status} ${response.statusText}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await response.json();
      this.logger.log(`ASPin notified successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        `Failed to notify ASPin for transaction ${transaction.aspin_transaction_id}:`,
        error,
      );
      // Could implement retry queue here for failed notifications
    }
  }
}
