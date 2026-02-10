import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum WebhookEventType {
  KYC_STATUS_CHANGED = 'kyc.status.changed',
}

export class VerificationDetailsDto {
  @ApiProperty({ example: 'PartnerCRM' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'kyc_abc123' })
  @IsString()
  @IsNotEmpty()
  verificationId: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  documentVerified?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  biometricVerified?: boolean;
}

export class KycWebhookDto {
  @ApiProperty({
    enum: WebhookEventType,
    example: WebhookEventType.KYC_STATUS_CHANGED,
  })
  @IsEnum(WebhookEventType)
  @IsNotEmpty()
  eventType: WebhookEventType;

  @ApiProperty({
    example: 'cust_1234567890_abc',
    description: 'Customer GUID from ASPIN'
  })
  @IsString()
  @IsNotEmpty()
  customer_guid: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED,
  })
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  verificationStatus: VerificationStatus;

  @ApiProperty({ example: '2024-02-10T11:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({ type: VerificationDetailsDto })
  @ValidateNested()
  @Type(() => VerificationDetailsDto)
  @IsOptional()
  verificationDetails?: VerificationDetailsDto;

  @ApiPropertyOptional({ example: 'Document quality insufficient' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
