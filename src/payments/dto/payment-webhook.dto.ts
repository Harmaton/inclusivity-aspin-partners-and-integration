import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum WebhookEventType {
  PAYMENT_STATUS_CHANGED = 'payment.status.changed',
}

/**
 * ⚠️ SECURITY NOTE:
 * Signature field included ONLY to match assignment mock.
 * REAL IMPLEMENTATIONS MUST use X-Webhook-Signature HTTP header.
 * This field is DEPRECATED and ignored in validation logic.
 */
export class PaymentWebhookDto {
  @ApiProperty({
    example: 'TXN_ASPIN_20260211_7890',
    description: 'ASPIN-generated transaction ID (NOT PaymentHub ID)',
    required: true,
  })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    example: 'completed',
    description: 'Current payment status',
    required: true,
    enum: WebhookStatus,
  })
  @IsEnum(WebhookStatus, { message: 'Invalid status value' })
  status: WebhookStatus;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in KES',
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    example: '2026-02-11T14:35:00Z',
    description: 'Status update timestamp (ISO 8601)',
    required: true,
  })
  @IsISO8601({ strict: true }, { message: 'Invalid timestamp format' })
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({
    example: 'payment.status.changed',
    description: 'Webhook event type',
    required: true,
    enum: WebhookEventType,
  })
  @IsEnum(WebhookEventType)
  @IsNotEmpty()
  event_type: WebhookEventType;

  /**
   * ⚠️ DEPRECATED: Included ONLY for assignment mock compliance.
   * REAL IMPLEMENTATIONS: Signature MUST be in X-Webhook-Signature header.
   * This field is IGNORED during validation (security best practice).
   */
  @ApiProperty({
    example: 'sha256_deprecated_field_do_not_use',
    description: '[DEPRECATED] Signature field - USE HEADER INSTEAD',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({
    example: 'INSUFFICIENT_FUNDS',
    description: 'Failure reason if status=failed',
    required: false,
  })
  @IsOptional()
  @IsString()
  failure_reason?: string;

  @ApiProperty({
    example: 'MPESA',
    description: 'Original payment provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
