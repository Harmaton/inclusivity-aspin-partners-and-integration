import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';

// Simple interface for in-memory storage (no TypeORM needed)
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

  // In-memory store for assignment (simple Map)
  private transactions = new Map<string, PaymentTransaction>();

  constructor(private readonly paymentHubService: PaymentHubService) {}

  /**
   * INITIATE PAYMENT FLOW
   * 1. Validate amount is exactly KES 5,000
   * 2. Check duplicate transaction (by policy_code)
   * 3. Forward to PaymentHub API
   * 4. Store transaction
   * 5. Return PaymentHub response
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    // VALIDATION 2: Duplicate check (by policy_code and customer number as a pair)
    for (const txn of this.transactions.values()) {
      if (txn.policy_code === dto.policy_code) {
        if (txn.status === 'pending' || txn.status === 'completed') {
          this.logger.warn(
            `DUPLICATE TRANSACTION: Policy ${dto.policy_code} already has active payment`,
          );
          throw new ConflictException({
            error: 'DuplicateTransaction',
            message: 'Payment already initiated for this policy',
            details: {
              existing_transaction_id: txn.aspin_transaction_id,
              status: txn.status,
            },
          });
        }
      }
    }

    this.logger.log(
      `INITIATING PAYMENT: policy=${dto.policy_code}, provider=${dto.provider}`,
    );

    // FORWARD TO PAYMENTHUB API
    const paymentHubResponse =
      await this.paymentHubService.initiatePayment(dto);

    // STORE TRANSACTION (in-memory for assignment)
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

    // RETURN PAYMENTHUB RESPONSE (exactly as specified in assignment)
    return paymentHubResponse;
  }
}
