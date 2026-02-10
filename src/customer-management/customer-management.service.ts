import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerManagementDto } from './dto/create-customer-management.dto';
import {
  KycWebhookDto,
  VerificationStatus,
  WebhookEventType,
} from './dto/kyc-webhook.dto';
import {
  Customer,
  CustomerRegistrationResponse,
} from './entities/customer-management.entity';

@Injectable()
export class CustomerManagementService {
  private readonly logger = new Logger(CustomerManagementService.name);
  private customers: Map<string, Customer> = new Map();
  private msisdnIndex: Map<string, string> = new Map(); // msisdn -> customer_guid mapping
  private externalIdIndex: Map<string, string> = new Map(); // external_identifier -> customer_guid

  /**
   * Register a new customer and initiate KYC verification with PartnerCRM
   * This simulates ASPIN's asynchronous customer registration flow
   */
  async create(
    createCustomerDto: CreateCustomerManagementDto,
    bearer_token: string,
    partnerGuid: string,
  ): Promise<CustomerRegistrationResponse> {
    this.logger.log(
      `Registering new customer: ${createCustomerDto.msisdn}, bearer token: ${bearer_token}, partnerGuid: ${partnerGuid}`,
    );

    // Check if customer already exists by MSISDN
    const existingByMsisdn = this.msisdnIndex.get(createCustomerDto.msisdn);
    if (existingByMsisdn) {
      this.logger.warn(
        `Customer with MSISDN ${createCustomerDto.msisdn} already exists`,
      );
      throw new ConflictException({
        error: 'ConflictError',
        message: 'Customer with this MSISDN already exists',
        details: { customer_guid: existingByMsisdn },
      });
    }

    // Check if customer already exists by external_identifier
    if (createCustomerDto.external_identifier) {
      const existingByExtId = this.externalIdIndex.get(
        createCustomerDto.external_identifier,
      );
      if (existingByExtId) {
        this.logger.warn(
          `Customer with external_identifier ${createCustomerDto.external_identifier} already exists`,
        );
        throw new ConflictException({
          error: 'ConflictError',
          message: 'Customer with this external_identifier already exists',
          details: { customer_guid: existingByExtId },
        });
      }
    }

    // Generate unique customer GUID
    const customer_guid = this.generateCustomerGuid();
    const now = new Date().toISOString();

    // Create customer record
    const customer: Customer = {
      customer_guid,
      first_name: createCustomerDto.first_name,
      surname: createCustomerDto.surname,
      msisdn: createCustomerDto.msisdn,
      date_of_birth: createCustomerDto.date_of_birth,
      national_id: createCustomerDto.national_id,
      partner_guid: createCustomerDto.partner_guid,
      display_language: createCustomerDto.display_language,
      beneficiary_msisdn: createCustomerDto.beneficiary_msisdn,
      beneficiary_name: createCustomerDto.beneficiary_name,
      external_identifier: createCustomerDto.external_identifier,
      registration_channel: createCustomerDto.registration_channel,
      account_number: createCustomerDto.account_number,
      account_type: createCustomerDto.account_type,
      branch_code: createCustomerDto.branch_code,
      registration_status: VerificationStatus.PENDING,
      created_at: now,
    };

    // Store customer
    this.customers.set(customer_guid, customer);
    this.msisdnIndex.set(customer.msisdn, customer_guid);

    if (customer.external_identifier) {
      this.externalIdIndex.set(customer.external_identifier, customer_guid);
    }

    // Simulate sending KYC request to PartnerCRM
    this.logger.log(
      `Sending KYC request to PartnerCRM for customer: ${customer_guid}`,
    );
    await this.sendToPartnerCRM(customer);

    return {
      customer_guid,
      registration_status: VerificationStatus.PENDING,
      message:
        'Customer registration request submitted successfully. KYC verification in progress.',
      created_at: now,
      customer: {
        first_name: customer.first_name,
        surname: customer.surname,
        date_of_birth: customer.date_of_birth,
        msisdn: customer.msisdn,
        national_id: customer.national_id,
        partner_guid: customer.partner_guid,
        display_language: customer.display_language,
      },
    };
  }

  /**
   * Process KYC webhook from PartnerCRM
   */
  processKycWebhook(webhookDto: KycWebhookDto): {
    received: boolean;
    message: string;
  } {
    this.logger.log(
      `Processing KYC webhook for customer: ${webhookDto.customer_guid}`,
    );

    const customer = this.customers.get(webhookDto.customer_guid);
    if (!customer) {
      this.logger.error(
        `Customer not found for webhook: ${webhookDto.customer_guid}`,
      );
      throw new NotFoundException({
        error: 'NotFoundError',
        message: 'Customer not found',
      });
    }

    // Validate webhook event type
    if (webhookDto.eventType !== WebhookEventType.KYC_STATUS_CHANGED) {
      throw new BadRequestException({
        error: 'ValidationError',
        message: 'Invalid webhook event type',
      });
    }

    // Update customer registration status
    customer.registration_status = webhookDto.verificationStatus;

    if (webhookDto.verificationStatus === VerificationStatus.APPROVED) {
      customer.verified_at = webhookDto.timestamp;
      customer.kyc_details = webhookDto.verificationDetails;
      this.logger.log(`Customer KYC approved: ${webhookDto.customer_guid}`);

      // In real implementation, trigger downstream processes
      this.onKycApproved(customer);
    } else if (webhookDto.verificationStatus === VerificationStatus.REJECTED) {
      customer.rejection_reason = webhookDto.rejectionReason;
      this.logger.warn(
        `Customer KYC rejected: ${webhookDto.customer_guid} - ${webhookDto.rejectionReason}`,
      );

      // Notify customer of rejection
      this.onKycRejected(customer);
    }

    this.customers.set(webhookDto.customer_guid, customer);

    return {
      received: true,
      message: 'Webhook processed successfully',
    };
  }

  /**
   * Generate a unique customer GUID (ASPIN-style format)
   */
  private generateCustomerGuid(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `cust_${timestamp}_${random}`;
  }

  /**
   * Simulate sending customer data to PartnerCRM for KYC verification
   * In real implementation, this would make an HTTP request to PartnerCRM API
   */
  private async sendToPartnerCRM(
    customer: Customer,
  ): Promise<VerificationStatus> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(
      `[PartnerCRM] KYC verification initiated for customer: ${customer.customer_guid}`,
    );

    // In real implementation:
    // const response = await this.httpService.post('https://partnercrm.api/kyc/verify', {
    //   customer_guid: customer.customer_guid,
    //   first_name: customer.first_name,
    //   surname: customer.surname,
    //   msisdn: customer.msisdn,
    //   date_of_birth: customer.date_of_birth,
    //   national_id: customer.national_id,
    //   partner_guid: customer.partner_guid,
    // }).toPromise();

    return VerificationStatus.PENDING;
  }

  /**
   * Handle KYC approval
   */
  private onKycApproved(customer: Customer): void {
    this.logger.log(
      `Processing KYC approval for customer: ${customer.customer_guid}`,
    );

    // In real implementation:
    // - Send welcome SMS/email via NotifyService
    // - Activate customer account
    // - Enable policy purchase capabilities
    // - Trigger any business workflows
    // - Update ASPIN system with approval status
  }

  /**
   * Handle KYC rejection
   */
  private onKycRejected(customer: Customer): void {
    this.logger.log(
      `Processing KYC rejection for customer: ${customer.customer_guid}`,
    );

    // In real implementation:
    // - Send rejection notification via NotifyService
    // - Provide re-submission instructions
    // - Log for compliance/audit
    // - Update ASPIN system with rejection status
  }
}
