import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  private async sendMail(to: string, subject: string, html: string, text?: string) {
    const fromName = process.env.MAIL_FROM_NAME ?? 'App Mailer';
    const fromEmail = process.env.MAIL_FROM_EMAIL ?? process.env.SMTP_USER!;
    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
  }

  async sendOtp(to: string, code: string, ttlMinutes = 10) {
    const html = `
      <h2>Tu código</h2>
      <p>Usá este código: <strong>${code}</strong></p>
      <p>Caduca en ${ttlMinutes} minutos.</p>
    `;
    await this.sendMail(to, 'Tu código OTP', html, `Código: ${code}`);
  }
}
