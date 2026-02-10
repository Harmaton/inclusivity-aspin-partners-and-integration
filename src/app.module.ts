import { Module } from '@nestjs/common';
import { CustomerManagementModule } from './customer-management/customer-management.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    CustomerManagementModule,
    ConfigModule.forRoot({
      envFilePath: '.env.example',
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
