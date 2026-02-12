// dto/webhook-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether webhook was processed successfully',
  })
  success: boolean;

  @ApiProperty({
    example: 'Webhook processed successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: 'TXN_123456',
    description: 'Transaction ID that was updated',
  })
  transaction_id: string;

  @ApiProperty({
    example: '2026-01-29T10:35:00Z',
    description: 'Processing timestamp',
  })
  processed_at: string;
}
