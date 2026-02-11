import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({
    example: true,
    description: 'Webhook payload received successfully',
  })
  received: boolean;

  @ApiProperty({
    example: true,
    description: 'Event processed (false = duplicate/idempotency)',
  })
  processed: boolean;

  @ApiProperty({
    example: 'TXN_ASPIN_20260211_7890',
    description: 'ASPIN transaction ID',
  })
  transaction_id: string;

  @ApiProperty({
    example: 'completed',
    description: 'New payment status after processing',
    required: false,
    enum: ['pending', 'completed', 'failed'],
  })
  new_status?: string;

  @ApiProperty({
    example: true,
    description: 'ASPIN backend successfully notified',
  })
  aspin_notified: boolean;

  @ApiProperty({
    example: 'Status updated to completed. Policy activated.',
    description: 'Processing details',
    required: false,
  })
  message?: string;

  @ApiProperty({
    example: '2026-02-11T14:35:00Z',
    description: 'Processing timestamp',
    required: false,
  })
  processed_at?: string;
}
