import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsISO8601,
  Min,
} from 'class-validator';

export enum WebhookPaymentStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class WebhookPaymentDto {
  @ApiProperty({
    example: 'TXN_123456',
    description: 'PaymentHub transaction identifier',
  })
  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @ApiProperty({
    example: 'completed',
    description: 'Payment status from PaymentHub',
    enum: WebhookPaymentStatus,
  })
  @IsEnum(WebhookPaymentStatus, {
    message: 'Status must be either completed or failed',
  })
  status: WebhookPaymentStatus;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in KES',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    example: '2026-01-29T10:35:00Z',
    description: 'Webhook timestamp (ISO 8601)',
  })
  @IsISO8601({ strict: true })
  timestamp: string;

  @ApiProperty({
    example: 'sha256_hash_here',
    description: 'Webhook signature for verification',
  })
  @IsNotEmpty()
  @IsString()
  signature: string;
}
