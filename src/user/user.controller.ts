import { Controller, Get, Put, Body, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserNameDto } from './dtos/create-user.dto'; // mismo archivo
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
}
