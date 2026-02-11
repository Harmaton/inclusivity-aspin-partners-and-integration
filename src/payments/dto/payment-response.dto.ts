import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    example: 'TXN_ASPIN_20260211_7890',
    description:
      'ASPIN-generated transaction reference (use for status checks)',
  })
  transaction_id: string;

  @ApiProperty({
    example: 'pending',
    description: 'Current transaction status',
    enum: ['pending', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in KES',
  })
  amount: number;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code',
  })
  currency: string;

  @ApiProperty({
    example: 'mpesa',
    description: 'Payment gateway used',
    enum: ['mpesa', 'airtel'],
  })
  provider: string;

  @ApiProperty({
    example: '2026-02-11T14:30:00Z',
    description: 'Transaction initiation timestamp (ISO 8601)',
  })
  timestamp: string;

  @ApiProperty({
    example: 'POL_ASPIN_789012',
    description: 'Associated ASPIN policy ID',
  })
  policy_id: string;

  @ApiProperty({
    example: 'ASP_REF_20260211_12345',
    description: 'ASPIN reference for idempotency',
    required: false,
  })
  aspin_reference?: string;

  @ApiProperty({
    example: 'Payment initiated successfully. Customer will receive prompt.',
    description: 'Human-readable status message',
  })
  message: string;
}
