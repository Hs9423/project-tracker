import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

interface EmailJob {
  notificationId: string;
  recipientId: string;
  type: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
}

const SUBJECTS: Record<string, string> = {
  task_assigned: 'You have been assigned a task',
  mention: 'You were mentioned in a comment',
  project_assigned: 'A project has been assigned to you',
  due_date_approaching: 'Task due in 48 hours',
  task_overdue: 'Task is overdue',
  task_status_changed: 'A task status has changed',
  comment_added: 'New comment on your item',
};

@Processor('email')
export class EmailProcessor {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  @Process('send')
  async handleSend(job: Job<EmailJob>) {
    const { recipientId, type, message } = job.data;

    const smtpUser = this.config.get<string>('SMTP_USER');
    if (!smtpUser) return;

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, emailNotifications: true, isActive: true },
    });

    if (!recipient || !recipient.isActive || !recipient.emailNotifications) return;

    const from = this.config.get<string>('MAIL_FROM', 'noreply@projecttracker.internal');
    const subject = SUBJECTS[type] ?? 'Project Tracker Notification';

    await this.transporter.sendMail({
      from,
      to: recipient.email,
      subject,
      text: message,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#333">${message}</p>`,
    });
  }
}
