import { Test, TestingModule } from '@nestjs/testing';
import { CustomerManagementService } from './customer-management.service';

describe('CustomerManagementService', () => {
  let service: CustomerManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerManagementService],
    }).compile();

    service = module.get<CustomerManagementService>(CustomerManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
