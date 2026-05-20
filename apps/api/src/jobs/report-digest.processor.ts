import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReportDigestProcessor {
  private readonly logger = new Logger(ReportDigestProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  // Daily digest — runs at 7 AM every day
  @Cron('0 7 * * *')
  async sendDailyDigests() {
    await this.sendDigest('daily');
  }

  // Weekly digest — runs Monday at 7 AM
  @Cron('0 7 * * 1')
  async sendWeeklyDigests() {
    await this.sendDigest('weekly');
  }

  private async sendDigest(mode: 'daily' | 'weekly') {
    if (!process.env.SMTP_USER) return;

    const users = await this.prisma.user.findMany({
      where: { notificationDigest: mode, emailNotifications: true, isActive: true },
      select: { id: true, name: true, email: true },
    });

    if (!users.length) return;

    const since = new Date();
    since.setDate(since.getDate() - (mode === 'weekly' ? 7 : 1));

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    for (const user of users) {
      try {
        const notifications = await this.prisma.notification.findMany({
          where: { recipientId: user.id, createdAt: { gte: since }, isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        if (!notifications.length) continue;

        const rows = notifications
          .map(n => `<li style="margin-bottom:8px">${n.message}</li>`)
          .join('');

        await transport.sendMail({
          from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
          to: user.email,
          subject: `Your ${mode} TeamTracker digest`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#1e293b">Hi ${user.name},</h2>
              <p style="color:#475569">Here's your ${mode} activity summary:</p>
              <ul style="color:#334155;padding-left:20px">${rows}</ul>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">
                You're receiving this because you have ${mode} digest enabled.
                <a href="${process.env.FRONTEND_URL}/settings">Manage preferences</a>
              </p>
            </div>
          `,
        });

        this.logger.log(`Sent ${mode} digest to ${user.email}`);
      } catch (err) {
        this.logger.error(`Failed to send digest to ${user.email}: ${(err as Error).message}`);
      }
    }
  }
}
