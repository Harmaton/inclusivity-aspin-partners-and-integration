import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerManagementDto } from './create-customer-management.dto';

export class UpdateCustomerManagementDto extends PartialType(CreateCustomerManagementDto) {}
