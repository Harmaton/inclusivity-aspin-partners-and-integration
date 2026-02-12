import { Module } from '@nestjs/common';
import { CustomerManagementModule } from './customer-management/customer-management.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CustomerManagementModule,
    PaymentsModule,
    ConfigModule.forRoot({
      envFilePath: '.env.example',
      isGlobal: true,
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 24, // Keys expire after 24 hours
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
