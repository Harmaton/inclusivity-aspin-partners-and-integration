import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PaymentHubService } from './providers/payment-hub/payment-hub.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aspin_jwt_secret_fallback',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentHubService],
})
export class PaymentsModule {}
