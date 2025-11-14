import { Controller, Get, Put, Post, Body, Req, UsePipes, ValidationPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserNameDto } from './dtos/create-user.dto'; // mismo archivo
import { User } from './user.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

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

  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = 'uploads/profiles';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const userId = (req.user as any)?.sub;
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${userId}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadPhoto(@Req() req: Request, @UploadedFile() file: Express.Multer.File): Promise<User> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const userId = (req.user as any)?.sub;
    const photoUrl = `/uploads/profiles/${file.filename}`;
    return this.users.updatePhotoUrl(userId, photoUrl);
  }
}
