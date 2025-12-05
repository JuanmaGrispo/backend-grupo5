import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { ClassSession, ClassSessionStatus } from '../class/class-session.entity';
import { Reservation, ReservationStatus } from '../reservation/reservation.entity';

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(ClassSession)
    private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  /**
   * Obtiene las notificaciones no leídas de un usuario
   * NO procesa automáticamente - todo se maneja por endpoints
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: {
        user: { id: userId },
        read: false,
      },
      relations: ['session', 'session.classRef', 'session.branch'],
      order: { createdAt: 'DESC' },
      withDeleted: false, // No incluir eliminadas
    });
  }

  /**
   * Obtiene todas las notificaciones de un usuario (leídas y no leídas)
   * NO procesa automáticamente - todo se maneja por endpoints
   */
  async getAllNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: {
        user: { id: userId },
      },
      relations: ['session', 'session.classRef', 'session.branch'],
      order: { createdAt: 'DESC' },
      take: limit,
      withDeleted: false, // No incluir eliminadas
    });
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ alreadyRead: boolean } | null> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      return null;
    }

    if (notification.read) {
      return { alreadyRead: true };
    }

    // Usar save() que maneja automáticamente los nombres de columnas
    notification.read = true;
    await this.notificationRepo.save(notification);

    // Verificar que se guardó correctamente
    const updated = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!updated || !updated.read) {
      throw new Error('Error al persistir el cambio de read a true');
    }

    return { alreadyRead: false };
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: string): Promise<number> {
    // Obtener todas las notificaciones no leídas del usuario
    const notifications = await this.notificationRepo.find({
      where: {
        user: { id: userId },
        read: false,
      },
    });

    if (notifications.length === 0) {
      return 0;
    }

    // Marcar todas como leídas usando save()
    notifications.forEach((n) => {
      n.read = true;
    });

    await this.notificationRepo.save(notifications);

    return notifications.length;
  }

  /**
   * Marca una notificación como no leída
   */
  async markAsUnread(notificationId: string, userId: string): Promise<{ alreadyUnread: boolean } | null> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      return null;
    }

    if (!notification.read) {
      return { alreadyUnread: true };
    }

    // Usar save() que maneja automáticamente los nombres de columnas
    notification.read = false;
    await this.notificationRepo.save(notification);

    // Verificar que se guardó correctamente
    const updated = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!updated || updated.read) {
      throw new Error('Error al persistir el cambio de read a false');
    }

    return { alreadyUnread: false };
  }

  /**
   * Elimina una notificación (soft delete)
   * La notificación persiste en la BD con deletedAt para que no se vuelva a crear
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, user: { id: userId } },
      withDeleted: true, // Incluir eliminadas para verificar
    });

    if (!notification) {
      return false;
    }

    // Soft delete: marcar como eliminada en lugar de borrar físicamente
    await this.notificationRepo.softRemove(notification);
    return true;
  }

  /**
   * Crea notificaciones para todos los usuarios con reservas en una sesión cancelada
   * Verifica por usuario para evitar duplicados
   */
  async notifySessionCanceled(sessionId: string, reason?: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['classRef', 'branch'],
    });

    if (!session) return;

      // Verificar qué usuarios ya tienen notificaciones para esta sesión (incluyendo eliminadas)
      // Si una notificación fue eliminada, no se vuelve a crear
      const existingNotifications = await this.notificationRepo.find({
        where: {
          session: { id: sessionId },
          type: NotificationType.SESSION_CANCELED,
        },
        relations: ['user'],
        withDeleted: true, // Incluir eliminadas para evitar recrearlas
      });

    const usersWithNotifications = new Set(
      existingNotifications.map((n) => n.user.id)
    );

    // Buscar TODAS las reservas de esta sesión (incluyendo las canceladas)
    // porque pueden haberse cancelado cuando se canceló la sesión
    const allReservations = await this.reservationRepo.find({
      where: {
        session: { id: sessionId },
      },
      relations: ['user'],
    });

    // Filtrar solo las que estaban confirmadas o que no tienen fecha de cancelación
    // Y que no tienen notificación ya creada
    const reservationsToNotify = allReservations.filter(
      (r) =>
        (r.status === ReservationStatus.CONFIRMED || !r.canceledAt) &&
        !usersWithNotifications.has(r.user.id)
    );

    if (reservationsToNotify.length === 0) return;

    const notifications = reservationsToNotify.map((reservation) =>
      this.notificationRepo.create({
        user: reservation.user,
        session: session,
        type: NotificationType.SESSION_CANCELED,
        title: `Sesión cancelada: ${session.classRef.title}`,
        body: reason
          ? `La sesión programada para ${this.formatDate(session.startAt)} ha sido cancelada. Motivo: ${reason}`
          : `La sesión programada para ${this.formatDate(session.startAt)} ha sido cancelada.`,
        read: false,
      }),
    );

    if (notifications.length > 0) {
      await this.notificationRepo.save(notifications);
    }
  }

  /**
   * Crea notificaciones para todos los usuarios con reservas en una sesión reprogramada
   * Notifica a TODAS las reservas (confirmadas y canceladas) porque la reprogramación afecta a todas
   */
  async notifySessionRescheduled(sessionId: string, oldStartAt: Date): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['classRef', 'branch'],
    });

    if (!session) return;

    // Verificar qué usuarios ya tienen notificaciones de reprogramación (incluyendo eliminadas)
    const existingNotifications = await this.notificationRepo.find({
      where: {
        session: { id: sessionId },
        type: NotificationType.SESSION_RESCHEDULED,
      },
      relations: ['user'],
      withDeleted: true, // Incluir eliminadas para evitar recrearlas
    });

    const usersWithNotifications = new Set(
      existingNotifications.map((n) => n.user.id)
    );

    // Buscar TODAS las reservas (confirmadas y canceladas) porque la reprogramación afecta a todas
    const allReservations = await this.reservationRepo.find({
      where: {
        session: { id: sessionId },
      },
      relations: ['user'],
    });

    // Crear notificaciones solo para usuarios que no tienen una ya (incluyendo eliminadas)
    const notificationsToCreate = allReservations
      .filter((reservation) => !usersWithNotifications.has(reservation.user.id))
      .map((reservation) =>
        this.notificationRepo.create({
          user: reservation.user,
          session: session,
          type: NotificationType.SESSION_RESCHEDULED,
          title: `Sesión reprogramada: ${session.classRef.title}`,
          body: `La sesión ha sido reprogramada de ${this.formatDate(oldStartAt)} a ${this.formatDate(session.startAt)}.`,
          read: false,
        }),
      );

    if (notificationsToCreate.length > 0) {
      await this.notificationRepo.save(notificationsToCreate);
      this.logger.debug(
        `Created ${notificationsToCreate.length} rescheduled notifications for session ${sessionId}`
      );
    }
  }

  /**
   * Procesa recordatorios de sesiones que empiezan en 1 hora
   * Se llama cuando el frontend consulta las notificaciones (long polling)
   */
  async processReminderNotifications(): Promise<void> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Buscar sesiones que empiezan en menos de 60 minutos (desde ahora hasta 60 minutos)
    // IMPORTANTE: Solo buscar sesiones del mismo día
    const sessions = await this.sessionRepo.find({
      where: {
        status: ClassSessionStatus.SCHEDULED,
        startAt: Between(now, oneHourFromNow), // Desde ahora hasta 60 minutos
      },
      relations: ['classRef', 'branch'],
    });

    // Filtrar adicionalmente para asegurar que:
    // 1. Están en menos de 60 minutos desde ahora
    // 2. Son del MISMO DÍA (no de días diferentes)
    // 3. La sesión está en el FUTURO (no ha pasado)
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const validSessions = sessions.filter((session) => {
      const sessionTime = new Date(session.startAt);
      const timeDiff = sessionTime.getTime() - now.getTime();
      
      // IMPORTANTE: Solo sesiones que están en el FUTURO (no han pasado)
      if (timeDiff <= 0) {
        this.logger.debug(
          `Skipping session ${session.id}: session already started or passed. StartAt: ${sessionTime.toISOString()}, Now: ${now.toISOString()}`
        );
        return false;
      }
      
      // Notificar cuando falte menos de 60 minutos (desde 0 hasta 60 minutos)
      const maxTime = 60 * 60 * 1000; // 60 minutos
      
      const isInTimeRange = timeDiff <= maxTime;
      
      if (!isInTimeRange) {
        this.logger.debug(
          `Skipping session ${session.id}: more than 60 minutes away. Time diff: ${Math.round(timeDiff / 60000)} minutes`
        );
      }
      
      // Verificar que sea del MISMO DÍA (no de días diferentes)
      const sessionDay = new Date(sessionTime.getFullYear(), sessionTime.getMonth(), sessionTime.getDate());
      const isSameDay = sessionDay.getTime() === nowDay.getTime();
      
      if (!isSameDay) {
        this.logger.debug(
          `Skipping session ${session.id}: different day. Now: ${nowDay.toISOString()}, Session: ${sessionDay.toISOString()}`
        );
      }
      
      return isInTimeRange && isSameDay;
    });

    for (const session of validSessions) {
      const reservations = await this.reservationRepo.find({
        where: {
          session: { id: session.id },
          status: ReservationStatus.CONFIRMED,
        },
        relations: ['user'],
      });

      if (reservations.length === 0) {
        continue;
      }

      // Verificar qué usuarios ya tienen notificaciones de recordatorio para esta sesión (incluyendo eliminadas)
      // Si una notificación fue eliminada, no se vuelve a crear
      const existingNotifications = await this.notificationRepo.find({
        where: {
          session: { id: session.id },
          type: NotificationType.SESSION_REMINDER,
        },
        relations: ['user'],
        withDeleted: true, // Incluir eliminadas para evitar recrearlas
      });

      const usersWithNotifications = new Set(
        existingNotifications.map((n) => n.user.id)
      );

      // Crear notificaciones solo para usuarios que no tienen una ya (leída o no leída)
      const notificationsToCreate = reservations
        .filter((reservation) => !usersWithNotifications.has(reservation.user.id))
        .map((reservation) =>
          this.notificationRepo.create({
            user: reservation.user,
            session: session,
            type: NotificationType.SESSION_REMINDER,
            title: `Recordatorio: ${session.classRef.title}`,
            body: `Falta menos de una hora para tu sesión (${this.formatDate(session.startAt)}).`,
            read: false,
          }),
        );

      if (notificationsToCreate.length > 0) {
        await this.notificationRepo.save(notificationsToCreate);
        this.logger.debug(
          `Created ${notificationsToCreate.length} reminder notifications for session ${session.id}`
        );
      }
    }
  }

  /**
   * Procesa notificaciones pendientes para sesiones canceladas que no tienen notificaciones
   * Útil para sesiones que fueron canceladas directamente en la BD
   * Verifica por usuario para evitar duplicados
   */
  async processPendingCancelNotifications(): Promise<number> {
    const canceledSessions = await this.sessionRepo.find({
      where: {
        status: ClassSessionStatus.CANCELED,
      },
      relations: ['classRef', 'branch'],
    });

    this.logger.debug(`Found ${canceledSessions.length} canceled sessions to process`);

    let processed = 0;

    for (const session of canceledSessions) {
      // Verificar qué usuarios ya tienen notificaciones para esta sesión (incluyendo eliminadas)
      // Si una notificación fue eliminada, no se vuelve a crear
      const existingNotifications = await this.notificationRepo.find({
        where: {
          session: { id: session.id },
          type: NotificationType.SESSION_CANCELED,
        },
        relations: ['user'],
        withDeleted: true, // Incluir eliminadas para evitar recrearlas
      });

      const usersWithNotifications = new Set(
        existingNotifications.map((n) => n.user.id)
      );

      // Buscar TODAS las reservas de esta sesión (sin importar su estado)
      // Si una sesión se canceló, todos los usuarios con reservas deben ser notificados
      const allReservations = await this.reservationRepo.find({
        where: {
          session: { id: session.id },
        },
        relations: ['user'],
      });

      this.logger.debug(
        `Session ${session.id}: Found ${allReservations.length} reservations, ${usersWithNotifications.size} users already have notifications`
      );

      if (allReservations.length === 0) {
        continue; // No hay reservas para esta sesión
      }

      // Filtrar solo las reservas de usuarios que NO tienen notificación ya
      // Incluimos todas las reservas (confirmadas o canceladas) porque si la sesión se canceló,
      // todos los usuarios que tenían reserva deben ser notificados
      const reservationsToNotify = allReservations.filter(
        (reservation) => !usersWithNotifications.has(reservation.user.id)
      );

      if (reservationsToNotify.length === 0) {
        continue; // Todos los usuarios ya tienen notificaciones
      }

      this.logger.debug(
        `Session ${session.id}: Creating ${reservationsToNotify.length} notifications`
      );

      // Crear notificaciones para usuarios que no tienen una ya
      const notificationsToCreate = reservationsToNotify.map((reservation) =>
        this.notificationRepo.create({
          user: reservation.user,
          session: session,
          type: NotificationType.SESSION_CANCELED,
          title: `Sesión cancelada: ${session.classRef.title}`,
          body: `La sesión programada para ${this.formatDate(session.startAt)} ha sido cancelada.`,
          read: false,
        }),
      );

      if (notificationsToCreate.length > 0) {
        await this.notificationRepo.save(notificationsToCreate);
        processed += notificationsToCreate.length;
        this.logger.log(
          `Created ${notificationsToCreate.length} notifications for canceled session ${session.id}`
        );
      }
    }

    if (processed > 0) {
      this.logger.log(`Processed ${processed} pending cancel notifications`);
    }

    return processed;
  }

  /**
   * Verifica si una sesión está en la ventana de 1 hora (58-62 minutos antes)
   * Helper para determinar si se debe crear notificación de recordatorio
   */
  private isWithinReminderWindow(sessionStartAt: Date): boolean {
    const now = new Date();
    const sessionTime = new Date(sessionStartAt);
    const timeDiff = sessionTime.getTime() - now.getTime();
    
    // Solo sesiones que están en el FUTURO (no han pasado)
    if (timeDiff <= 0) {
      return false;
    }
    
    // Notificar cuando falte menos de 60 minutos (desde 0 hasta 60 minutos)
    const maxTime = 60 * 60 * 1000; // 60 minutos
    
    const isInTimeRange = timeDiff <= maxTime;
    
    // Verificar que sea del MISMO DÍA (no de días diferentes)
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDay = new Date(sessionTime.getFullYear(), sessionTime.getMonth(), sessionTime.getDate());
    const isSameDay = sessionDay.getTime() === nowDay.getTime();
    
    return isInTimeRange && isSameDay;
  }

  /**
   * Crea notificaciones de recordatorio para una sesión específica
   * Se usa cuando se reprograma una sesión a menos de 1 hora
   */
  async notifyReminderForSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['classRef', 'branch'],
    });

    if (!session) return;
    
    // Verificar que esté en la ventana de recordatorio
    if (!this.isWithinReminderWindow(session.startAt)) {
      this.logger.debug(`Session ${sessionId} is not within reminder window, skipping reminder notification`);
      return;
    }

    // Solo sesiones SCHEDULED
    if (session.status !== ClassSessionStatus.SCHEDULED) {
      this.logger.debug(`Session ${sessionId} is not SCHEDULED, skipping reminder notification`);
      return;
    }

    const reservations = await this.reservationRepo.find({
      where: {
        session: { id: sessionId },
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['user'],
    });

    if (reservations.length === 0) {
      return;
    }

    // Verificar qué usuarios ya tienen notificaciones de recordatorio (incluyendo eliminadas)
    const existingNotifications = await this.notificationRepo.find({
      where: {
        session: { id: sessionId },
        type: NotificationType.SESSION_REMINDER,
      },
      relations: ['user'],
      withDeleted: true, // Incluir eliminadas para evitar recrearlas
    });

    const usersWithNotifications = new Set(
      existingNotifications.map((n) => n.user.id)
    );

    // Crear notificaciones solo para usuarios que no tienen una ya
    const notificationsToCreate = reservations
      .filter((reservation) => !usersWithNotifications.has(reservation.user.id))
      .map((reservation) =>
        this.notificationRepo.create({
          user: reservation.user,
          session: session,
          type: NotificationType.SESSION_REMINDER,
          title: `Recordatorio: ${session.classRef.title}`,
          body: `Falta menos de una hora para tu sesión (${this.formatDate(session.startAt)}).`,
          read: false,
        }),
      );

    if (notificationsToCreate.length > 0) {
      await this.notificationRepo.save(notificationsToCreate);
      this.logger.log(
        `Created ${notificationsToCreate.length} reminder notifications for rescheduled session ${sessionId}`
      );
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
