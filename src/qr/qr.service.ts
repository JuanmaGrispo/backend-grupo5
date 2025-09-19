import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  generateDataUrl(payload: string) {
    return QRCode.toDataURL(payload, { errorCorrectionLevel: 'H' });
  }
}
