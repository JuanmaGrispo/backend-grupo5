import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dtos/create-rating.dto';
import { UpdateRatingDto } from './dtos/update-rating.dto';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * Crear una nueva calificación para una sesión
   * POST /api/v1/ratings
   */
  @Post()
  async createRating(@Req() req: Request, @Body() dto: CreateRatingDto) {
    const userId = (req.user as any)?.sub;
    return this.ratingService.createRating(userId, dto);
  }

  /**
   * Obtener mis calificaciones
   * GET /api/v1/ratings/me
   */
  @Get('me')
  async getMyRatings(@Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.ratingService.getMyRatings(userId);
  }

  /**
   * Obtener calificaciones de una sesión específica
   * GET /api/v1/ratings/session/:sessionId
   */
  @Get('session/:sessionId')
  async getSessionRatings(@Param('sessionId') sessionId: string) {
    return this.ratingService.getSessionRatings(sessionId);
  }

  /**
   * Obtener promedio de calificaciones de una sesión
   * GET /api/v1/ratings/session/:sessionId/average
   */
  @Get('session/:sessionId/average')
  async getSessionAverage(@Param('sessionId') sessionId: string) {
    return this.ratingService.getSessionAverageRating(sessionId);
  }

  /**
   * Actualizar una calificación existente
   * PUT /api/v1/ratings/:id
   */
  @Put(':id')
  async updateRating(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
  ) {
    const userId = (req.user as any)?.sub;
    return this.ratingService.updateRating(userId, id, dto);
  }

  /**
   * Eliminar una calificación
   * DELETE /api/v1/ratings/:id
   */
  @Delete(':id')
  async deleteRating(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any)?.sub;
    await this.ratingService.deleteRating(userId, id);
    return { success: true, message: 'Calificación eliminada' };
  }
}
