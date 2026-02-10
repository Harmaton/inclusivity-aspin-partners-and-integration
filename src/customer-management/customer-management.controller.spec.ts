import { Test, TestingModule } from '@nestjs/testing';
import { CustomerManagementController } from './customer-management.controller';
import { CustomerManagementService } from './customer-management.service';

describe('CustomerManagementController', () => {
  let controller: CustomerManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerManagementController],
      providers: [CustomerManagementService],
    }).compile();

    controller = module.get<CustomerManagementController>(
      CustomerManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
