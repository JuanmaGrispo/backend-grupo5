import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './branch.entity';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(Branch) private readonly repo: Repository<Branch>,
  ) {}

  async getAll(): Promise<Branch[]> {
    // Ordená como prefieras; name suele ser útil
    return this.repo.find({ order: { name: 'ASC' } });
  }
}
