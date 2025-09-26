import { Controller, Get, Put, Post, Body, Req, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserNameDto } from './dtos/create-user.dto';
import { SetPasswordDto } from './dtos/set-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { VerifyPasswordDto } from './dtos/verify-password.dto';
import { User } from './user.entity';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('user')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  async getMe(@Req() req: Request): Promise<User> {
    const userId = (req.user as any)?.sub;
    return this.users.getById(userId);
  }

  @Put('me')
  async updateMe(@Req() req: Request, @Body() dto: UpdateUserNameDto): Promise<User> {
    const userId = (req.user as any)?.sub;
    return this.users.updateName(userId, dto.name ?? '');
  }

  // Password endpoints
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Req() req: Request, @Body() dto: SetPasswordDto): Promise<{ success: boolean; message: string }> {
    const userId = (req.user as any)?.sub;
    await this.users.setPassword(userId, dto);
    return { success: true, message: 'Contraseña configurada exitosamente' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
    const userId = (req.user as any)?.sub;
    await this.users.changePassword(userId, dto);
    return { success: true, message: 'Contraseña cambiada exitosamente' };
  }

  @Post('verify-password')
  @HttpCode(HttpStatus.OK)
  async verifyPassword(@Req() req: Request, @Body() dto: VerifyPasswordDto): Promise<{ success: boolean; isValid: boolean }> {
    const userId = (req.user as any)?.sub;
    const isValid = await this.users.verifyPassword(userId, dto);
    return { success: true, isValid };
  }
}
