import { Module } from '@nestjs/common';
import { CustomerManagementService } from './customer-management.service';
import { CustomerManagementController } from './customer-management.controller';

@Module({
  controllers: [CustomerManagementController],
  providers: [CustomerManagementService],
})
export class CustomerManagementModule {}
