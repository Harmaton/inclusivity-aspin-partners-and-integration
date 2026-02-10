import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../dto/kyc-webhook.dto';

export class KycDetails {
  provider: string;
  verificationId: string;
  documentVerified?: boolean;
  biometricVerified?: boolean;
}

export class Customer {
  @ApiProperty({ example: 'cust_1234567890_abc' })
  customer_guid: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  surname: string;

  @ApiProperty({ example: '00254712345678' })
  msisdn: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  email?: string;

  @ApiProperty({ example: '1990-05-15' })
  date_of_birth: string;

  @ApiProperty({ example: '12345678' })
  national_id: string;

  @ApiProperty({ example: 'demo' })
  partner_guid: string;

  @ApiProperty({ example: 'en' })
  display_language: string;

  @ApiPropertyOptional({ example: '00254700000000' })
  beneficiary_msisdn?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  beneficiary_name?: string;

  @ApiPropertyOptional({ example: 'ext_cust_12345' })
  external_identifier?: string;

  @ApiProperty({ example: 'ApiClient' })
  registration_channel: string;

  @ApiPropertyOptional({ example: '1234567890' })
  account_number?: string;

  @ApiPropertyOptional({ example: 'Savings' })
  account_type?: string;

  @ApiPropertyOptional({ example: '12345' })
  branch_code?: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  registration_status: VerificationStatus;

  @ApiProperty({ example: '2024-02-10T10:30:00Z' })
  created_at: string;

  @ApiPropertyOptional({ example: '2024-02-10T11:00:00Z' })
  verified_at?: string;

  @ApiPropertyOptional()
  kyc_details?: KycDetails;

  @ApiPropertyOptional({ example: 'Document quality insufficient' })
  rejection_reason?: string;
}

export class CustomerRegistrationResponse {
  @ApiProperty({
    example: 'cust_1234567890_abc',
    description: 'Unique customer GUID assigned by ASPIN',
  })
  customer_guid: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
    description: 'Registration status: pending, approved, or rejected',
  })
  registration_status: VerificationStatus;

  @ApiProperty({
    example:
      'Customer registration request submitted successfully. KYC verification in progress.',
    description: 'Human-readable message about the registration status',
  })
  message: string;

  @ApiProperty({
    example: '2024-02-10T10:30:00Z',
    description: 'Timestamp when registration was created',
  })
  created_at: string;

  @ApiPropertyOptional({
    description: 'Customer details as stored in ASPIN',
  })
  customer?: {
    first_name: string;
    surname: string;
    date_of_birth: string;
    msisdn: string;
    national_id: string;
    partner_guid: string;
    display_language: string;
  };
}

export class CustomerStatusResponse {
  @ApiProperty({ example: 'cust_1234567890_abc' })
  customer_guid: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED,
  })
  registration_status: VerificationStatus;

  @ApiPropertyOptional({ example: '2024-02-10T11:00:00Z' })
  verified_at?: string;

  @ApiPropertyOptional()
  kyc_details?: KycDetails;

  @ApiPropertyOptional({ example: 'Document quality insufficient' })
  rejection_reason?: string;

  @ApiPropertyOptional({
    description: 'Full customer details',
  })
  customer?: Customer;
}
