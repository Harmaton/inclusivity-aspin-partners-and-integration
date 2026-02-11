import { ApiProperty } from '@nestjs/swagger';

/**
 * EXACT response format from assignment specification:
 * {
 *   "transaction_id": "TXN_123456",
 *   "status": "pending",
 *   "amount": 5000,
 *   "currency": "KES",
 *   "timestamp": "2026-01-29T10:30:00Z"
 * }
 */
export class PaymentResponseDto {
  @ApiProperty({
    example: 'TXN_123456',
    description: 'PaymentHub transaction identifier',
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
    description: 'Currency code (ISO 4217)',
  })
  currency: string;

  @ApiProperty({
    example: '2026-01-29T10:30:00Z',
    description: 'Transaction timestamp (ISO 8601)',
  })
  timestamp: string;
}