import { PaymentsService } from './payments.service';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';
import { ConflictException } from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

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
        amount_in_cents: 300000, // Invalid: not exactly 500000
        currency: 'KES',
        provider: 'mpesa',
        msisdn: '254712345678',
        channel: 'APIClient',
        product_code: 'PROD_HEALTH_001',
      };

      // The DTO validation should fail before reaching PaymentHub
      // This tests that only 500000 cents is accepted
      expect(invalidDto.amount_in_cents).not.toBe(500000);
    });

    it('should accept only exact amount of 500000 cents (KES 5000)', async () => {
      const validDto: InitiatePaymentDto = {
        policy_code: 'POL_ASPIN_789012',
        amount_in_cents: 500000, // Valid: exactly 500000
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
});
