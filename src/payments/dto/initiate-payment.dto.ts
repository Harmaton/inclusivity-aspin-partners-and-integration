import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentProvider {
  MPESA = 'mpesa',
  AIRTEL = 'airtel',
}

export class InitiatePaymentDto {
  @ApiProperty({
    example: 'POL_ASPIN_789012',
    description: 'ASPIN policy identifier requiring premium payment',
    required: true,
  })
  @IsNotEmpty({ message: 'Policy CODE is required' })
  @IsString()
  policy_code: string;

  @ApiProperty({
    example: 500000,
    description:
      'Payment amount in cents (must be exactly 500,000 cents = KES 5,000 for policy premium)',
    required: true,
    minimum: 500000,
    maximum: 500000,
  })
  @IsInt({ message: 'Amount in cents must be an integer' })
  @Min(500000, { message: 'Amount must be exactly 500,000 cents (KES 5,000)' })
  @Max(500000, { message: 'Amount must be exactly 500,000 cents (KES 5,000)' })
  amount_in_cents: number;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code (ISO 4217)',
    required: true,
    enum: ['KES'],
  })
  @IsNotEmpty()
  @IsString()
  currency = 'KES' as const;

  @ApiProperty({
    example: 'mpesa',
    description: 'Payment gateway provider',
    required: true,
    // enum: PaymentProvider,
  })
  // @IsEnum(PaymentProvider, { message: 'Provider must be mpesa or airtel' })
  provider: string;

  @ApiProperty({
    example: '254712345678',
    description: 'Customer MSISDN in E.164 format (without + or 00 prefix)',
    required: true,
    pattern: '^254[0-9]{9}$',
  })
  @IsNotEmpty({ message: 'MSISDN is required' })
  @Matches(/^254[0-9]{9}$/, {
    message: 'MSISDN must be Kenyan number in 254XXXXXXXXX format',
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: 'APIClient',
    description: 'Payment channel identifier',
    required: true,
    enum: ['APIClient', 'WebPortal', 'MobileApp', 'AgentPortal'],
  })
  @IsOptional()
  @IsString()
  channel: 'APIClient' | 'WebPortal' | 'MobileApp' | 'AgentPortal' =
    'APIClient' as const;

  @ApiProperty({
    example: 'PROD_HEALTH_001',
    description: 'Product code identifying the insurance product',
    required: true,
  })
  @IsNotEmpty({ message: 'Product code is required' })
  @IsString()
  product_code: string;

  @ApiProperty({
    example: 'ASP_REF_20260211_12345',
    description: 'ASPIN-generated reference for idempotency (recommended)',
    required: false,
  })
  @IsOptional()
  @IsString()
  aspin_reference?: string;

  @ApiProperty({
    example: 'Premium payment for Policy POL_ASPIN_789012',
    description: 'Payment description shown to customer',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2026-02-11T14:30:00Z',
    description: 'Timestamp of payment request (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Timestamp must be valid ISO 8601' })
  @Type(() => Date)
  timestamp?: string;
}
