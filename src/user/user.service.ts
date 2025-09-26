import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { SetPasswordDto } from './dtos/set-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { VerifyPasswordDto } from './dtos/verify-password.dto';

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

    const user = this.userRepo.create({ 
      email: normEmail, 
      name: dto.name,
      hasPassword: false 
    });
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

  // Password-related methods
  async setPassword(userId: string, dto: SetPasswordDto): Promise<User> {
    const user = await this.getById(userId);
    
    if (user.hasPassword) {
      throw new BadRequestException('El usuario ya tiene una contraseña configurada');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    user.passwordHash = passwordHash;
    user.hasPassword = true;
    
    return this.userRepo.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<User> {
    const user = await this.getById(userId);
    
    if (!user.hasPassword || !user.passwordHash) {
      throw new BadRequestException('El usuario no tiene una contraseña configurada');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    user.passwordHash = newPasswordHash;
    
    return this.userRepo.save(user);
  }

  async verifyPassword(userId: string, dto: VerifyPasswordDto): Promise<boolean> {
    const user = await this.getById(userId);
    
    if (!user.hasPassword || !user.passwordHash) {
      throw new BadRequestException('El usuario no tiene una contraseña configurada');
    }

    return bcrypt.compare(dto.password, user.passwordHash);
  }

  async loginWithPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    
    if (!user || !user.hasPassword || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }
}
