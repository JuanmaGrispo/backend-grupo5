import { Controller, Get, Param, Post, Body, NotFoundException, BadRequestException, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { QrService } from './qr.service';
import { ClassService } from '../class/class.service';

@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly classService: ClassService,
  ) {}

  /**
   * Genera un QR para una sesión (para mostrar en molinete/recepción)
   * GET /qr/session/:sessionId
   * 
   * Query params:
   *   - format=json (default): Retorna JSON con data URL
   *   - format=image: Retorna imagen PNG directamente (para descargar/imprimir)
   */
  @Get('session/:sessionId')
  async generateSessionQr(
    @Param('sessionId') sessionId: string,
    @Query('format') format: string = 'json',
    @Res() res?: Response,
  ) {
    const session = await this.classService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // El QR contiene el sessionId para que al escanearlo se pueda validar
    const qrData = sessionId;
    
    // Si piden formato imagen, retornar PNG directamente
    if (format === 'image' && res) {
      const qrBuffer = await this.qrService.generateBuffer(qrData);
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-session-${sessionId.substring(0, 8)}.png"`,
      });
      return res.send(qrBuffer);
    }

    // Por defecto, retornar JSON con data URL
    const qrImage = await this.qrService.generateDataUrl(qrData);

    return {
      sessionId: session.id,
      qrImage, // Data URL de la imagen del QR (puede usarse en <img src={qrImage} />)
      qrData, // El contenido del QR (sessionId)
      sessionInfo: {
        classTitle: session.classRef.title,
        startAt: session.startAt,
        branch: session.branch?.name || 'Sin sede',
      },
      // URL para descargar como imagen
      downloadUrl: `/qr/session/${sessionId}?format=image`,
    };
  }

  /**
   * Genera un QR para cualquier texto/payload
   * POST /qr/generate
   * Body: { payload: string }
   * 
   * Útil para generar QR de prueba o con datos personalizados
   */
  @Post('generate')
  async generateQr(@Body('payload') payload: string) {
    if (!payload) {
      throw new BadRequestException('payload es requerido');
    }

    const qrImage = await this.qrService.generateDataUrl(payload);

    return {
      qrImage, // Data URL de la imagen del QR
      qrData: payload, // El contenido del QR
    };
  }

  /**
   * Lee/valida un QR escaneado y devuelve los datos del turno
   * POST /qr/scan
   * Body: { qrData: string }
   */
  @Post('scan')
  async scanQr(@Body('qrData') qrData: string) {
    if (!qrData) {
      throw new BadRequestException('qrData es requerido');
    }

    // El qrData debería ser el sessionId
    const sessionId = qrData.trim();

    const session = await this.classService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Validar que la sesión esté en un estado válido para check-in
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS'];
    if (!validStatuses.includes(session.status)) {
      throw new BadRequestException('La sesión no admite check-in en este momento');
    }

    // Retornar datos del turno: clase, horario, sede
    return {
      sessionId: session.id,
      class: {
        id: session.classRef.id,
        title: session.classRef.title,
        description: session.classRef.description,
        discipline: session.classRef.discipline,
        instructorName: session.classRef.instructorName,
      },
      schedule: {
        startAt: session.startAt,
        endAt: session.endAt,
        durationMin: session.durationMin,
      },
      branch: session.branch ? {
        id: session.branch.id,
        name: session.branch.name,
        location: session.branch.location,
      } : null,
      status: session.status,
    };
  }
}
