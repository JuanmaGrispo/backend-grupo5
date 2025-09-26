import { BadRequestException, Injectable, NotFoundException  } from '@nestjs/common';
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

    const user = this.userRepo.create({ email: normEmail, name: dto.name, passwordHash: dto.passwordHash });
    return this.userRepo.save(user);
  }
  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateName(userId: string, name: string): Promise<User> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Nombre requerido');

    const user = await this.getById(userId);
    user.name = trimmed;
    return this.userRepo.save(user);
  }
}
