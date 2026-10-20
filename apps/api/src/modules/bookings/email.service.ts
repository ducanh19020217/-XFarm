import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class BookingEmailService {
  private readonly logger = new Logger(BookingEmailService.name);
  async send(to: string | null | undefined, subject: string, html: string) {
    if (!to || !process.env.SMTP_HOST) return;
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 1025),
        secure: false,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@xfarm.local',
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Không gửi được email booking: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
