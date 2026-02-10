import { Module } from '@nestjs/common';
import { CustomerManagementModule } from './customer-management/customer-management.module';
import { ConfigModule } from '@nestjs/config';
import aspinConfig from './config/aspin.config';

@Module({
  imports: [
    CustomerManagementModule,
    ConfigModule.forRoot({
      envFilePath: '.env.example',
      isGlobal: true,
      load: [aspinConfig],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
