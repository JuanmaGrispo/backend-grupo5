import { Controller, Get, Post, Delete, Param, UseGuards, Req, Query, HttpCode, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotifierService } from './notifier.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotifierController {
  constructor(private readonly notifierService: NotifierService) {}

  /**
   * Obtiene las notificaciones no leídas del usuario autenticado
   * Este es el endpoint que el cliente llamará periódicamente (long polling)
   */
  @Get()
  async getNotifications(@Req() req: any, @Query('all') all?: string) {
    const userId = req.user.id;
    
    // Si se especifica 'all', debe ser 'true'
    if (all !== undefined && all !== 'true') {
      throw new BadRequestException("El parámetro 'all' debe ser 'true' para obtener todas las notificaciones");
    }
    
    if (all === 'true') {
      return this.notifierService.getAllNotifications(userId);
    }
    
    return this.notifierService.getUnreadNotifications(userId);
  }

  /**
   * Marca una notificación como leída
   */
  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const result = await this.notifierService.markAsRead(id, userId);
    
    if (!result) {
      throw new NotFoundException('Notificación no encontrada');
    }
    
    if (result.alreadyRead) {
      throw new BadRequestException('La notificación ya está marcada como leída');
    }
    
    return { 
      success: true, 
      message: 'Notificación marcada como leída' 
    };
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    const count = await this.notifierService.markAllAsRead(userId);
    return { 
      success: true, 
      message: 'Todas las notificaciones fueron marcadas como leídas',
      count 
    };
  }

  /**
   * Marca una notificación como no leída
   */
  @Post(':id/unread')
  async markAsUnread(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const result = await this.notifierService.markAsUnread(id, userId);
    
    if (!result) {
      throw new NotFoundException('Notificación no encontrada');
    }
    
    if (result.alreadyUnread) {
      throw new BadRequestException('La notificación ya está marcada como no leída');
    }
    
    return { 
      success: true, 
      message: 'Notificación marcada como no leída' 
    };
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const deleted = await this.notifierService.deleteNotification(id, userId);
    
    if (!deleted) {
      throw new NotFoundException('Notificación no encontrada');
    }
    
    return { 
      success: true, 
      message: 'Notificación eliminada correctamente' 
    };
  }

  /**
   * Procesa notificaciones pendientes para sesiones canceladas
   * Útil si se cancelaron sesiones directamente en la BD
   */
  @Post('process-pending')
  async processPending(@Req() req: any) {
    const count = await this.notifierService.processPendingCancelNotifications();
    return { success: true, processed: count };
  }
}
