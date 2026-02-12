import { PaymentsService } from './payments.service';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import {
  WebhookPaymentDto,
  WebhookPaymentStatus,
} from './dto/webhook-payment.dto';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let paymentHubService: PaymentHubService;

  beforeEach(() => {
    paymentHubService = new PaymentHubService();
    paymentsService = new PaymentsService(paymentHubService);
  });

  describe('initiatePayment - success', () => {
    it('should successfully initiate payment and return PaymentHub response', async () => {
      const dto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
        aspin_reference: 'ASP_REF_20260211_12345',
        description: 'Premium payment for Policy POL_ASPIN_789012',
        timestamp: '2026-02-11T14:30:00Z',
      };

      const mockResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockResponse);

      const result = await paymentsService.initiatePayment(dto);

      expect(result).toEqual(mockResponse);
      expect(result.transaction_id).toBe('TXN_123456');
      expect(result.status).toBe('pending');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('KES');
    });
  });

  describe('initiatePayment - amount validation', () => {
    it('should reject payment with amount other than 500000 cents (KES 5000)', () => {
      const invalidDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 300000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      expect(invalidDto.amount_in_cents).not.toBe(500000);
    });

    it('should accept only exact amount of 500000 cents (KES 5000)', async () => {
      const validDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockResponse);

      const result = await paymentsService.initiatePayment(validDto);

      expect(result.amount).toBe(5000);
      expect(validDto.amount_in_cents).toBe(500000);
    });
  });

  describe('initiatePayment - duplicate prevention', () => {
    it('should throw ConflictException when duplicate transaction exists', async () => {
      const dto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockResponse);

      // First payment - should succeed
      await paymentsService.initiatePayment(dto);

      // Second payment with same policy_code + msisdn - should fail
      await expect(paymentsService.initiatePayment(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(paymentsService.initiatePayment(dto)).rejects.toThrow(
        'Payment already initiated for this policy and customer',
      );
    });
  });

  // ============================================
  // WEBHOOK TESTS
  // ============================================

  describe('processWebhook - success', () => {
    it('should successfully process webhook with valid signature', async () => {
      // First, create a transaction via initiatePayment
      const initiateDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockInitiateResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockInitiateResponse);

      await paymentsService.initiatePayment(initiateDto);

      // Now process webhook for that transaction
      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_valid_signature',
      };

      const result = await paymentsService.processWebhook(webhookDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
      expect(result.transaction_id).toBe('TXN_123456');
      expect(result.processed_at).toBeDefined();
    });
  });

  describe('processWebhook - idempotency', () => {
    it('should handle idempotent webhook - same webhook processed twice', async () => {
      // Create transaction
      const initiateDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockInitiateResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockInitiateResponse);

      await paymentsService.initiatePayment(initiateDto);

      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_same_signature',
      };

      // Process webhook first time
      const firstResult = await paymentsService.processWebhook(webhookDto);
      expect(firstResult.success).toBe(true);
      expect(firstResult.message).toBe('Webhook processed successfully');

      // Process same webhook second time - should be idempotent
      const secondResult = await paymentsService.processWebhook(webhookDto);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toBe(
        'Webhook already processed (idempotent)',
      );
      expect(secondResult.transaction_id).toBe('TXN_123456');
    });

    it('should allow different webhooks for same transaction with different signatures', async () => {
      // Create transaction
      const initiateDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockInitiateResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockInitiateResponse);

      await paymentsService.initiatePayment(initiateDto);

      // First webhook
      const firstWebhook: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_signature_1',
      };

      await paymentsService.processWebhook(firstWebhook);

      // Second webhook with different signature - should process (not idempotent)
      const secondWebhook: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:36:00Z',
        signature: 'sha256_signature_2',
      };

      const result = await paymentsService.processWebhook(secondWebhook);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });
  });

  describe('processWebhook - validation failures', () => {
    it('should reject webhook with invalid signature', async () => {
      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'invalid_signature',
      };

      await expect(paymentsService.processWebhook(webhookDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(paymentsService.processWebhook(webhookDto)).rejects.toThrow(
        'Webhook signature validation failed',
      );
    });

    it('should reject webhook for non-existent transaction', async () => {
      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_NONEXISTENT',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_valid_signature',
      };

      await expect(paymentsService.processWebhook(webhookDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(paymentsService.processWebhook(webhookDto)).rejects.toThrow(
        'Transaction not found in system',
      );
    });
  });

  describe('processWebhook - status updates', () => {
    it('should update transaction status from pending to completed', async () => {
      // Create transaction
      const initiateDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockInitiateResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockInitiateResponse);

      await paymentsService.initiatePayment(initiateDto);

      // Process webhook to mark as completed
      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.COMPLETED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_valid',
      };

      const result = await paymentsService.processWebhook(webhookDto);

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('TXN_123456');
    });

    it('should handle failed payment status webhook', async () => {
      // Create transaction
      const initiateDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000,
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      const mockInitiateResponse: PaymentResponseDto = {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      };

      jest
        .spyOn(paymentHubService, 'initiatePaymentHub')
        .mockResolvedValue(mockInitiateResponse);

      await paymentsService.initiatePayment(initiateDto);

      // Process webhook with failed status
      const webhookDto: WebhookPaymentDto = {
        transaction_id: 'TXN_123456',
        status: WebhookPaymentStatus.FAILED,
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:35:00Z',
        signature: 'sha256_valid',
      };

      const result = await paymentsService.processWebhook(webhookDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });
  });
});
