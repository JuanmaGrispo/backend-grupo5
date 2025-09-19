import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const norm = this.normalizeEmail(email);
    return this.userRepo.findOne({ where: { email: norm } });
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const normEmail = this.normalizeEmail(dto.email);

    const exists = await this.getUserByEmail(normEmail);
    if (exists) throw new BadRequestException('El email ya está registrado');

    const user = this.userRepo.create({ email: normEmail, name: dto.name });
    return this.userRepo.save(user);
  }
}
