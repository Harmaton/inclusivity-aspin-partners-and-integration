import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@ApiTags('Payment Integration')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate payment collection',
    description: `Initiates payment collection through PaymentHub.
    Amount must be exactly KES 5,000 for policy premium.`,
  })
  @ApiBody({ type: InitiatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated successfully',
    type: PaymentResponseDto,
    schema: {
      example: {
        transaction_id: 'TXN_123456',
        status: 'pending',
        amount: 5000,
        currency: 'KES',
        timestamp: '2026-01-29T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment request',
    schema: {
      example: {
        error: 'InvalidAmount',
        message: 'Payment amount must be exactly KES 5,000 for policy premium',
        details: { expected_amount: 5000, received_amount: 4000 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
    schema: {
      example: {
        error: 'Unauthorized',
        message: 'Invalid partner authentication token',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate transaction attempt',
    schema: {
      example: {
        error: 'DuplicateTransaction',
        message: 'Payment already initiated for this policy',
        details: { existing_transaction_id: 'TXN_ASPIN_12345' },
      },
    },
  })
  @ApiResponse({
    status: 502,
    description: 'Payment gateway unavailable',
    schema: {
      example: {
        error: 'GatewayTimeout',
        message: 'PaymentHub gateway temporarily unavailable. Please retry.',
        details: { provider: 'mpesa', timeout_ms: 5000 },
      },
    },
  })
  async initiatePayment(
    @Body() paymentDto: InitiatePaymentDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(
      `Initiating payment: policy=${paymentDto.policy_code}, amount=${paymentDto.amount_in_cents}`,
    );
    try {
      console.log(paymentDto);
      // VALIDATION 1: Amount must be exactly KES 5,000
      if (
        paymentDto.amount_in_cents !== 5000 ||
        paymentDto.currency !== 'KES'
      ) {
        this.logger.warn(
          `INVALID AMOUNT: ${paymentDto.amount_in_cents} ${paymentDto.currency} for policy ${paymentDto.policy_code}`,
        );
        throw new BadRequestException({
          error: 'InvalidAmount',
          message:
            'Payment amount must be exactly KES 5,000 for policy premium',
          details: {
            expected_amount: 5000,
            received_amount: paymentDto.amount_in_cents,
            currency: paymentDto.currency,
          },
        });
      }
      return await this.paymentsService.initiatePayment(paymentDto);
    } catch (error) {
      this.logger.error('Payment initiation failed:', error);

      if (error instanceof BadRequestException) throw error;
      if (error instanceof ConflictException) throw error;

      // Handle timeout errors
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.code === 'ETIMEDOUT' ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        error.message?.includes('timeout') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        error.message?.includes('unavailable')
      ) {
        throw new ServiceUnavailableException({
          error: 'GatewayTimeout',
          message: 'PaymentHub gateway temporarily unavailable. Please retry.',
          details: {
            provider: paymentDto.provider,
            timeout_ms: process.env.PAYMENT_TIMEOUT_MS || '5000',
          },
        });
      }

      throw new ServiceUnavailableException({
        error: 'PaymentProcessingError',
        message: 'Failed to process payment request',
      });
    }
  }
}
