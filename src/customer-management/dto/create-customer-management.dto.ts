import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerManagementDto {
  @ApiProperty({
    example: '00254712345678',
    description: 'Customer phone number in international format (MSISDN)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(00|\+)\d{10,15}$/, {
    message:
      'Phone number must be in international format (e.g., 00254712345678)',
  })
  msisdn: string;

  @ApiProperty({ example: 'John', description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Customer surname/last name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  surname: string;

  @ApiProperty({
    example: 'demo',
    description: 'Partner GUID identifying your organization',
  })
  @IsString()
  @IsNotEmpty()
  partner_guid: string;

  @ApiProperty({
    example: 'en',
    description: 'Display language code (en, fr, sw, rw, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  display_language: string;

  @ApiProperty({
    example: '12345678',
    description: 'National ID or passport number',
  })
  @IsString()
  @IsNotEmpty()
  national_id: string;

  @ApiPropertyOptional({
    example: '00254700000000',
    description: 'Beneficiary phone number in international format',
  })
  @IsString()
  @IsOptional()
  beneficiary_msisdn?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Beneficiary full name',
  })
  @IsString()
  @IsOptional()
  beneficiary_name?: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  date_of_birth: string;

  @ApiPropertyOptional({
    example: 'ext_cust_12345',
    description: 'External identifier for customer in your system',
  })
  @IsString()
  @IsOptional()
  external_identifier?: string;

  @ApiProperty({ example: 'ApiClient', description: 'Registration channel' })
  @IsString()
  @IsNotEmpty()
  registration_channel: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Bank account number',
  })
  @IsString()
  @IsOptional()
  account_number?: string;

  @ApiPropertyOptional({
    example: 'Savings',
    description: 'Account type (Savings, Current, etc.)',
  })
  @IsString()
  @IsOptional()
  account_type?: string;

  @ApiPropertyOptional({ example: '12345', description: 'Bank branch code' })
  @IsString()
  @IsOptional()
  branch_code?: string;
}
