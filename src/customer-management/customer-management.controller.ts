import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomerManagementService } from './customer-management.service';
import { CreateCustomerManagementDto } from './dto/create-customer-management.dto';
import { UpdateCustomerManagementDto } from './dto/update-customer-management.dto';

@Controller('customer-management')
export class CustomerManagementController {
  constructor(
    private readonly customerManagementService: CustomerManagementService,
  ) {}

  @Post()
  create(@Body() createCustomerManagementDto: CreateCustomerManagementDto) {
    return this.customerManagementService.create(createCustomerManagementDto);
  }

  @Get()
  findAll() {
    return this.customerManagementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerManagementService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerManagementDto: UpdateCustomerManagementDto,
  ) {
    return this.customerManagementService.update(
      +id,
      updateCustomerManagementDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerManagementService.remove(+id);
  }
}
