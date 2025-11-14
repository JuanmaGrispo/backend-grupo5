import { NestFactory } from '@nestjs/core'; // Crea la app Nest
import { AppModule } from './app.module'; // Módulo raíz
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common'; // Utilidades globales
import helmet from 'helmet' // Seguridad HTTP (cabeceras)
import compression from 'compression'; // Comprimir respuestas (gzip/br)
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  // Servir archivos estáticos desde la carpeta uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.setGlobalPrefix('api'); // Prefijo /app. en routes

  // Versionado
  app.enableVersioning({
    type: VersioningType.URI, // La versión va en la URL
    defaultVersion: '1'
  })
  // Seguridad básica: deshabilita cabeceras peligrosas, protege de ataques comunes
  app.use(helmet()); 

  // CORS: quién puede llamar a la app desde el navegador
  const origins = process.env.FRONTEND_ORIGIN ?
  process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim()) : true;

  app.enableCors({
    origin: origins,
    credentials: true, // Permite cookies / auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Validación global de DTOs: aplica los @IsEmail, @Length, etc
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Quita campos que no están en el DTO
    forbidNonWhitelisted: true, // Si mandan campos de más tira 400
    transform: true // Convierte tipos de (string -> number) según DTO
  }))

  // Permite cerrar bien la app cuando el proceso recibe SIGTERM/SIGINT
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 9100);
  const host = process.env.HOST ?? '0.0.0.0';


  await app.listen(port, host);
  logger.log(`Ready on http://${host}:${port}/api/v1`);
}

// Ejecuta el arranque
bootstrap();
