import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  /**
   * Genera un QR como Data URL (para mostrar en HTML/img src)
   */
  generateDataUrl(payload: string) {
    return QRCode.toDataURL(payload, { errorCorrectionLevel: 'H' });
  }

  /**
   * Genera un QR como buffer (para enviar como imagen)
   */
  async generateBuffer(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload, { errorCorrectionLevel: 'H' });
  }

  /**
   * Genera un QR como string SVG
   */
  async generateSvg(payload: string): Promise<string> {
    return QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'H' });
  }
}
