import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionRating } from './rating.entity';
import { ClassSession, ClassSessionStatus } from '../class/class-session.entity';
import { Attendance } from '../attendance/attendance.entity';
import { CreateRatingDto } from './dtos/create-rating.dto';
import { UpdateRatingDto } from './dtos/update-rating.dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(SessionRating)
    private readonly ratingRepo: Repository<SessionRating>,
    @InjectRepository(ClassSession)
    private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
  ) {}

  /**
   * Crea una calificación para una sesión
   * Requisitos:
   * - El usuario debe haber asistido a la sesión (verificar attendance)
   * - Solo puede calificar una vez por sesión
   * - La sesión debe estar COMPLETED
   */
  async createRating(userId: string, dto: CreateRatingDto): Promise<SessionRating> {
    // Verificar que la sesión existe
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: ['classRef'],
    });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Verificar que la sesión esté completada
    if (session.status !== ClassSessionStatus.COMPLETED) {
      throw new BadRequestException('Solo se pueden calificar sesiones completadas');
    }

    // Verificar que no hayan pasado más de 24 horas desde el fin de la sesión
    const now = new Date();
    const endAt = new Date(session.startAt.getTime() + session.durationMin * 60_000);
    const deadline = new Date(endAt.getTime() + 24 * 60 * 60 * 1000); // 24 horas después del fin
    
    if (now > deadline) {
      throw new BadRequestException('Solo se pueden calificar sesiones dentro de las 24 horas posteriores a su finalización');
    }

    // Verificar que el usuario asistió a la sesión
    const attendance = await this.attendanceRepo.findOne({
      where: { user: { id: userId }, session: { id: dto.sessionId } },
    });
    if (!attendance) {
      throw new UnauthorizedException('Debes haber asistido a la sesión para calificarla');
    }

    // Verificar que no exista ya una calificación de este usuario para esta sesión
    const existing = await this.ratingRepo.findOne({
      where: { user: { id: userId }, session: { id: dto.sessionId } },
    });
    if (existing) {
      throw new BadRequestException('Ya calificaste esta sesión');
    }

    // Crear la calificación
    const rating = this.ratingRepo.create({
      user: { id: userId } as any,
      session: { id: dto.sessionId } as any,
      rating: dto.rating,
      comment: dto.comment,
    });

    return this.ratingRepo.save(rating);
  }

  /**
   * Obtiene todas las calificaciones de un usuario
   */
  async getMyRatings(userId: string): Promise<SessionRating[]> {
    return this.ratingRepo.find({
      where: { user: { id: userId } },
      relations: { session: { classRef: true } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene todas las calificaciones de una sesión específica
   */
  async getSessionRatings(sessionId: string): Promise<SessionRating[]> {
    // Verificar que la sesión existe
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return this.ratingRepo.find({
      where: { session: { id: sessionId } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Actualiza una calificación existente
   * Solo el dueño puede actualizarla
   */
  async updateRating(
    userId: string,
    ratingId: string,
    dto: UpdateRatingDto,
  ): Promise<SessionRating> {
    const rating = await this.ratingRepo.findOne({
      where: { id: ratingId },
      relations: { user: true },
    });

    if (!rating) {
      throw new NotFoundException('Calificación no encontrada');
    }

    // Verificar que el usuario sea el dueño
    if (rating.user.id !== userId) {
      throw new UnauthorizedException('No tenés permiso para modificar esta calificación');
    }

    // Actualizar campos si están presentes
    if (dto.rating !== undefined) {
      rating.rating = dto.rating;
    }
    if (dto.comment !== undefined) {
      rating.comment = dto.comment;
    }

    return this.ratingRepo.save(rating);
  }

  /**
   * Elimina una calificación
   * Solo el dueño puede eliminarla
   */
  async deleteRating(userId: string, ratingId: string): Promise<void> {
    const rating = await this.ratingRepo.findOne({
      where: { id: ratingId },
      relations: { user: true },
    });

    if (!rating) {
      throw new NotFoundException('Calificación no encontrada');
    }

    // Verificar que el usuario sea el dueño
    if (rating.user.id !== userId) {
      throw new UnauthorizedException('No tenés permiso para eliminar esta calificación');
    }

    await this.ratingRepo.remove(rating);
  }

  /**
   * Obtiene el promedio de calificaciones de una sesión
   */
  async getSessionAverageRating(sessionId: string): Promise<{ average: number; count: number }> {
    const ratings = await this.ratingRepo.find({
      where: { session: { id: sessionId } },
      select: ['rating'],
    });

    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;

    return {
      average: Math.round(average * 10) / 10, // Redondear a 1 decimal
      count: ratings.length,
    };
  }
}
