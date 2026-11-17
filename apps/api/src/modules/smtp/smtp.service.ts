import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdateSmtpConfigDto } from './dto/update-smtp-config.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SmtpService {
  constructor(private readonly prisma: PrismaService) {}

  async getSmtpConfig(organizationId: string) {
    const config = await this.prisma.smtpConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        isConfigured: false,
        host: '',
        port: 587,
        secure: false,
        username: '',
        passwordConfigured: false,
        fromEmail: '',
        fromName: 'ORBIT Notifications',
      };
    }

    return {
      id: config.id,
      isConfigured: config.isConfigured,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      passwordConfigured: Boolean(config.password),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      updatedAt: config.updatedAt,
    };
  }

  async updateSmtpConfig(organizationId: string, dto: UpdateSmtpConfigDto) {
    const existing = await this.prisma.smtpConfig.findUnique({
      where: { organizationId },
    });

    // If password is not provided in update, keep the existing password
    const passwordToSave = dto.password !== undefined && dto.password.trim() !== ''
      ? dto.password
      : existing?.password || null;

    const saved = await this.prisma.smtpConfig.upsert({
      where: { organizationId },
      update: {
        host: dto.host,
        port: dto.port,
        secure: dto.secure ?? false,
        username: dto.username || null,
        password: passwordToSave,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName || 'ORBIT Service Operations',
        isConfigured: true,
      },
      create: {
        organizationId,
        host: dto.host,
        port: dto.port,
        secure: dto.secure ?? false,
        username: dto.username || null,
        password: passwordToSave,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName || 'ORBIT Service Operations',
        isConfigured: true,
      },
    });

    return {
      id: saved.id,
      isConfigured: saved.isConfigured,
      host: saved.host,
      port: saved.port,
      secure: saved.secure,
      username: saved.username,
      passwordConfigured: Boolean(saved.password),
      fromEmail: saved.fromEmail,
      fromName: saved.fromName,
      updatedAt: saved.updatedAt,
    };
  }

  async sendTestEmail(organizationId: string, dto: SendTestEmailDto) {
    const config = await this.prisma.smtpConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.host || !config.fromEmail) {
      throw new BadRequestException('SMTP configuration is not set up yet. Please fill in and save the details first.');
    }

    const transporterOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      connectionTimeout: 10000,
    };

    if (config.username && config.password) {
      transporterOptions.auth = {
        user: config.username,
        pass: config.password,
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    try {
      // 1. Verify connection
      await transporter.verify();

      // 2. Send test email
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: dto.recipientEmail,
        subject: 'ORBIT Enterprise Operations — SMTP Test Message',
        text: 'Congratulations! Your SMTP settings for ORBIT have been successfully configured and verified.',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FAF9F6;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
              <div style="background: #2563EB; color: white; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">O</div>
              <span style="font-size: 18px; font-weight: 700; color: #1E293B; letter-spacing: -0.5px; margin-left: 8px;">ORBIT Platform</span>
            </div>
            <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #E2E8F0;">
              <h2 style="color: #059669; margin-top: 0; font-size: 18px; font-weight: 600;">✓ SMTP Gateway Connection Verified</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                This test message confirms that your outbound email settings on <strong>${config.host}:${config.port}</strong> are functioning correctly.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748B; border-bottom: 1px solid #F1F5F9;">Sender:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-weight: 500; border-bottom: 1px solid #F1F5F9; font-family: monospace;">${config.fromName} &lt;${config.fromEmail}&gt;</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B; border-bottom: 1px solid #F1F5F9;">Target Recipient:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-weight: 500; border-bottom: 1px solid #F1F5F9; font-family: monospace;">${dto.recipientEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Timestamp:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-weight: 500; font-family: monospace;">${new Date().toISOString()}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 11px; color: #94A3B8; margin-top: 20px; text-align: center;">
              Sent by ORBIT Operations Management System • Multi-tenant notification dispatch
            </p>
          </div>
        `,
      });

      return {
        success: true,
        messageId: info.messageId,
        recipient: dto.recipientEmail,
        message: 'SMTP test email sent successfully!',
      };
    } catch (err: any) {
      throw new BadRequestException(`SMTP Connection or Sending failed: ${err.message || 'Unknown network error'}`);
    }
  }

  async sendMail(
    organizationId: string,
    options: {
      to: string;
      subject: string;
      html: string;
      text?: string;
    },
  ) {
    const config = await this.prisma.smtpConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.isConfigured || !config.host) {
      console.warn(`[SmtpService] Skipping email: SMTP not configured for organization ${organizationId}`);
      return null;
    }

    const transporterOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
    };

    if (config.username && config.password) {
      transporterOptions.auth = {
        user: config.username,
        pass: config.password,
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    return transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}
