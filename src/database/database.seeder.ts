import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { ClassEntity } from '../class/class.entity';
import { ClassSession, ClassSessionStatus } from '../class/class-session.entity';
import { Branch } from '../branch/branch.entity';
import { Reservation, ReservationStatus } from '../reservation/reservation.entity';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);
  private readonly TARGET_USER_ID = 'daf38758-b76c-459d-ab41-7a16c9a9484e';

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassEntity) private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Reservation) private readonly reservationRepo: Repository<Reservation>,
    private readonly configService: ConfigService,
  ) {}

  async seed(): Promise<void> {
    const shouldSeed = this.configService.get<string>('SEED_DATABASE') === 'true';
    
    if (!shouldSeed) {
      this.logger.log('SEED_DATABASE is not enabled, skipping seed');
      return;
    }

    this.logger.log('Starting database seed...');

    try {
      // Verificar que el usuario existe
      const user = await this.userRepo.findOne({ where: { id: this.TARGET_USER_ID } });
      if (!user) {
        this.logger.warn(`User ${this.TARGET_USER_ID} not found. Creating user...`);
        const newUser = this.userRepo.create({
          id: this.TARGET_USER_ID,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
        });
        await this.userRepo.save(newUser);
        this.logger.log('User created');
      }

      // Crear o obtener branches
      let branch1 = await this.branchRepo.findOne({ where: { name: 'Sede Centro' } });
      if (!branch1) {
        branch1 = this.branchRepo.create({
          name: 'Sede Centro',
          location: 'Av. Corrientes 1234, CABA',
        });
        branch1 = await this.branchRepo.save(branch1);
        this.logger.log('Branch 1 created');
      }

      let branch2 = await this.branchRepo.findOne({ where: { name: 'Sede Palermo' } });
      if (!branch2) {
        branch2 = this.branchRepo.create({
          name: 'Sede Palermo',
          location: 'Av. Santa Fe 4567, CABA',
        });
        branch2 = await this.branchRepo.save(branch2);
        this.logger.log('Branch 2 created');
      }

      // Crear clases
      const classes = await this.createClasses();
      this.logger.log(`Created ${classes.length} classes`);

      // Crear sesiones
      const sessions = await this.createSessions(classes, [branch1, branch2]);
      this.logger.log(`Created ${sessions.length} sessions`);

      // Crear reservas para el usuario objetivo
      const reservations = await this.createReservations(sessions, this.TARGET_USER_ID);
      this.logger.log(`Created ${reservations.length} reservations for user ${this.TARGET_USER_ID}`);

      this.logger.log('Database seed completed successfully');
    } catch (error) {
      this.logger.error('Error seeding database', error);
      throw error;
    }
  }

  private async createClasses(): Promise<ClassEntity[]> {
    const classesData = [
      {
        title: 'Yoga Matutino',
        description: 'Clase de yoga para empezar el día con energía',
        discipline: 'Yoga',
        defaultDurationMin: 60,
        defaultCapacity: 20,
        instructorName: 'María González',
        locationName: 'Sala A',
        locationAddress: 'Av. Corrientes 1234',
      },
      {
        title: 'Pilates Intermedio',
        description: 'Clase de pilates para nivel intermedio',
        discipline: 'Pilates',
        defaultDurationMin: 45,
        defaultCapacity: 15,
        instructorName: 'Juan Pérez',
        locationName: 'Sala B',
        locationAddress: 'Av. Santa Fe 4567',
      },
      {
        title: 'Funcional Avanzado',
        description: 'Entrenamiento funcional de alta intensidad',
        discipline: 'Funcional',
        defaultDurationMin: 50,
        defaultCapacity: 25,
        instructorName: 'Ana Martínez',
        locationName: 'Sala C',
        locationAddress: 'Av. Corrientes 1234',
      },
    ];

    const classes: ClassEntity[] = [];
    for (const classData of classesData) {
      let existingClass = await this.classRepo.findOne({ where: { title: classData.title } });
      if (!existingClass) {
        existingClass = this.classRepo.create(classData);
        existingClass = await this.classRepo.save(existingClass);
      }
      classes.push(existingClass);
    }

    return classes;
  }

  private async createSessions(
    classes: ClassEntity[],
    branches: Branch[],
  ): Promise<ClassSession[]> {
    const sessions: ClassSession[] = [];
    const now = new Date();
    
    // Usar la fecha de HOY (5 de diciembre)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Horarios para hoy
    const timeSlots = [
      { hour: 9, minute: 0 },   // 9:00 AM
      { hour: 14, minute: 0 },  // 2:00 PM
      { hour: 18, minute: 0 },  // 6:00 PM
    ];

    // Crear solo 3 sesiones, una por clase, todas para hoy
    for (let i = 0; i < classes.length; i++) {
      const classEntity = classes[i];
      const branch = branches[i % branches.length];
      const timeSlot = timeSlots[i % timeSlots.length];
      
      const startAt = new Date(today);
      startAt.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      
      // La primera sesión empieza en 1 hora desde ahora (para probar recordatorios)
      if (i === 0) {
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        startAt.setTime(oneHourFromNow.getTime());
        startAt.setSeconds(0, 0);
      }

      const existingSession = await this.sessionRepo.findOne({
        where: {
          classRef: { id: classEntity.id },
          startAt: startAt,
        },
      });

      if (!existingSession) {
        const session = this.sessionRepo.create({
          classRef: classEntity,
          startAt: startAt,
          durationMin: classEntity.defaultDurationMin,
          capacity: classEntity.defaultCapacity,
          status: startAt < now 
            ? ClassSessionStatus.COMPLETED 
            : ClassSessionStatus.SCHEDULED,
          reservedCount: 0,
          branch: branch,
        });

        const savedSession = await this.sessionRepo.save(session);
        sessions.push(savedSession);
      }
    }

    return sessions;
  }

  private async createReservations(
    sessions: ClassSession[],
    userId: string,
  ): Promise<Reservation[]> {
    const reservations: Reservation[] = [];
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Crear reservas para todas las sesiones futuras (solo las del 5 de diciembre)
    const futureSessions = sessions.filter(
      (s) => s.status === ClassSessionStatus.SCHEDULED && s.startAt > new Date(),
    );

    for (const session of futureSessions) {
      // Verificar si ya existe una reserva
      const existingReservation = await this.reservationRepo.findOne({
        where: {
          user: { id: userId },
          session: { id: session.id },
          status: ReservationStatus.CONFIRMED,
        },
      });

      if (!existingReservation) {
        const reservation = this.reservationRepo.create({
          user: user,
          session: session,
          status: ReservationStatus.CONFIRMED,
        });

        const savedReservation = await this.reservationRepo.save(reservation);
        reservations.push(savedReservation);

        // Actualizar el contador de reservas
        await this.sessionRepo.increment({ id: session.id }, 'reservedCount', 1);
      }
    }

    return reservations;
  }
}

