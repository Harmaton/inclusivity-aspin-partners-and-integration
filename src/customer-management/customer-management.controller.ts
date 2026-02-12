import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerManagementService } from './customer-management.service';
import { CreateCustomerManagementDto } from './dto/create-customer-management.dto';
import { KycWebhookDto } from './dto/kyc-webhook.dto';
import { CustomerRegistrationResponse } from './entities/customer-management.entity';

@ApiTags('Customer Management')
@ApiBearerAuth()
@Controller('customers')
export class CustomerManagementController {
  private readonly logger = new Logger(CustomerManagementController.name);
  constructor(
    private readonly customerManagementService: CustomerManagementService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a new customer',
    description: `Register a new customer and initiate KYC verification with PartnerCRM. 
    This endpoint works asynchronously - it submits a registration request and returns an acknowledgement 
    with a unique customer GUID. Use the GUID to check registration status using the GET /customers/:guid endpoint.`,
  })
  @ApiQuery({
    name: 'partner',
    required: true,
    description: 'Partner GUID (e.g., "demo")',
    example: 'demo',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer registration request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload - validation error',
    schema: {
      example: {
        error: 'ValidationError',
        message: 'Invalid request data',
        details: [
          {
            field: 'msisdn',
            message: 'Phone number must be in international format',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing OAuth token',
    schema: {
      example: {
        error: 'Unauthorized',
        message: 'Invalid access token',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'Customer already exists with this MSISDN or external_identifier',
    schema: {
      example: {
        error: 'ConflictError',
        message: 'Customer with this MSISDN already exists',
        details: { customer_guid: 'cust_1707564600_abc123' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Server Error',
  })
  async create(
    @Body() createCustomerDto: CreateCustomerManagementDto,
    @Query('partner_guid') partnerGuid: string,
    @Query('bearer_token') bearer_token: string,
  ): Promise<CustomerRegistrationResponse> {
    this.logger.log(
      `Registering customer with partner: ${partnerGuid}, MSISDN: ${createCustomerDto.msisdn}`,
    );
    return this.customerManagementService.create(
      createCustomerDto,
      bearer_token,
      partnerGuid,
    );
  }

  @Post('webhooks/kyc-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook callback for KYC status updates',
    description: `PartnerCRM sends status updates to this endpoint when customer verification status changes.
    This endpoint should be configured in PartnerCRM's webhook settings.
    
    SECURITY: Validate X-Webhook-Signature header to ensure webhook is from PartnerCRM.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      example: {
        received: true,
        message: 'Webhook processed successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Server Error',
  })
  receiveKycWebhook(
    @Body() kycWebhookDto: KycWebhookDto,
    @Headers('x-webhook-signature') webhookSignature?: string,
  ): { received: boolean; message: string } {
    console.log(webhookSignature);
    // In production, validate webhook signature here
    // const isValid = await this.webhookService.validateSignature(kycWebhookDto, webhookSignature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }

    return this.customerManagementService.processKycWebhook(kycWebhookDto);
  }
}
