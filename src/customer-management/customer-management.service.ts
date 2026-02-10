import { Injectable } from '@nestjs/common';
import { CreateCustomerManagementDto } from './dto/create-customer-management.dto';
import { UpdateCustomerManagementDto } from './dto/update-customer-management.dto';

@Injectable()
export class CustomerManagementService {
  create(createCustomerManagementDto: CreateCustomerManagementDto) {
    return 'This action adds a new customerManagement';
  }

  findAll() {
    return `This action returns all customerManagement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customerManagement`;
  }

  update(id: number, updateCustomerManagementDto: UpdateCustomerManagementDto) {
    return `This action updates a #${id} customerManagement`;
  }

  remove(id: number) {
    return `This action removes a #${id} customerManagement`;
  }
}
