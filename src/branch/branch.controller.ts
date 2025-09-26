import { Controller, Get } from '@nestjs/common';
import { BranchService } from './branch.service';
import { Branch } from './branch.entity';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  getAll(): Promise<Branch[]> {
    return this.branchService.getAll();
  }
}
