import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BulkUpdateNotificationSettingsDto, TestNotificationDto } from './dto/notification-setting.dto';

export interface NotificationCategoryMeta {
  category: string;
  label: string;
  description: string;
  targetAudience: 'Customer' | 'Technician / Staff' | 'Internal Ops';
  defaultChannels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
  };
}

export const ENTERPRISE_NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    category: 'TICKET_CREATED',
    label: 'New Service Ticket Created',
    description: 'Dispatched when a customer or support agent logs a new service request or repair ticket.',
    targetAudience: 'Customer',
    defaultChannels: { inApp: true, email: true, whatsapp: true },
  },
  {
    category: 'TECHNICIAN_ASSIGNED',
    label: 'Field Engineer Assigned & Dispatched',
    description: 'Dispatched to customer with engineer ETA & details, and to the field technician with job card.',
    targetAudience: 'Customer',
    defaultChannels: { inApp: true, email: true, whatsapp: true },
  },
  {
    category: 'WORK_ORDER_COMPLETED',
    label: 'Work Order Completed & Verified',
    description: 'Dispatched upon OTP confirmation and repair sign-off on customer premises.',
    targetAudience: 'Customer',
    defaultChannels: { inApp: true, email: true, whatsapp: true },
  },
  {
    category: 'INVOICE_GENERATED',
    label: 'Service Invoice Auto-Generated',
    description: 'Dispatched with billing breakdown, tax calculation, and payment link upon job completion.',
    targetAudience: 'Customer',
    defaultChannels: { inApp: true, email: true, whatsapp: true },
  },
  {
    category: 'WARRANTY_CLAIM_UPDATED',
    label: 'Warranty Claim Status Evaluated',
    description: 'Dispatched when product serial number is verified, warranty approved, or flagged billable.',
    targetAudience: 'Customer',
    defaultChannels: { inApp: true, email: true, whatsapp: true },
  },
  {
    category: 'LOW_STOCK_ALERT',
    label: 'Low Stock & Inventory Reorder Alert',
    description: 'Dispatched to inventory controllers and warehouse managers when spare part stock breaches safety threshold.',
    targetAudience: 'Internal Ops',
    defaultChannels: { inApp: true, email: true, whatsapp: false },
  },
];

export interface DispatchNotificationOptions {
  category: string;
  title: string;
  message: string;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  staffName?: string | null;
  staffEmail?: string | null;
  staffPhone?: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smtpService: SmtpService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Get all category settings for the organization (merged with default definitions)
   */
  async getSettings(organizationId: string) {
    const existing = await this.prisma.notificationSetting.findMany({
      where: { organizationId },
    });

    const existingMap = new Map(existing.map((item) => [item.category, item]));

    return ENTERPRISE_NOTIFICATION_CATEGORIES.map((cat) => {
      const saved = existingMap.get(cat.category);
      return {
        category: cat.category,
        label: cat.label,
        description: cat.description,
        targetAudience: cat.targetAudience,
        inAppEnabled: saved ? saved.inAppEnabled : cat.defaultChannels.inApp,
        emailEnabled: saved ? saved.emailEnabled : cat.defaultChannels.email,
        whatsappEnabled: saved ? saved.whatsappEnabled : cat.defaultChannels.whatsapp,
        updatedAt: saved?.updatedAt || null,
      };
    });
  }

  /**
   * Save / bulk update category settings
   */
  async updateSettings(organizationId: string, dto: BulkUpdateNotificationSettingsDto) {
    const operations = dto.settings.map((s) =>
      this.prisma.notificationSetting.upsert({
        where: {
          organizationId_category: {
            organizationId,
            category: s.category,
          },
        },
        create: {
          organizationId,
          category: s.category,
          inAppEnabled: s.inAppEnabled,
          emailEnabled: s.emailEnabled,
          whatsappEnabled: s.whatsappEnabled,
        },
        update: {
          inAppEnabled: s.inAppEnabled,
          emailEnabled: s.emailEnabled,
          whatsappEnabled: s.whatsappEnabled,
        },
      }),
    );

    await this.prisma.$transaction(operations);
    return this.getSettings(organizationId);
  }

  /**
   * Central Dispatcher: Routes notifications to configured channels
   */
  async dispatch(organizationId: string, options: DispatchNotificationOptions) {
    const {
      category,
      title,
      message,
      userId,
      customerEmail,
      customerPhone,
      customerName,
      staffEmail,
      staffPhone,
      staffName,
      metadata,
    } = options;

    const setting = await this.prisma.notificationSetting.findUnique({
      where: {
        organizationId_category: {
          organizationId,
          category,
        },
      },
    });

    const defaultCat = ENTERPRISE_NOTIFICATION_CATEGORIES.find((c) => c.category === category);
    const inAppAllowed = setting ? setting.inAppEnabled : (defaultCat?.defaultChannels.inApp ?? true);
    const emailAllowed = setting ? setting.emailEnabled : (defaultCat?.defaultChannels.email ?? true);
    const whatsappAllowed = setting ? setting.whatsappEnabled : (defaultCat?.defaultChannels.whatsapp ?? true);

    const dispatchResults: {
      inApp: boolean;
      emailSent: boolean;
      whatsappSent: boolean;
      errors: string[];
    } = {
      inApp: false,
      emailSent: false,
      whatsappSent: false,
      errors: [],
    };

    // 1. In-App Notification Dispatch
    if (inAppAllowed) {
      try {
        await this.prisma.inAppNotification.create({
          data: {
            organizationId,
            userId: userId || null,
            category,
            title,
            message,
            metadata: metadata ? (metadata as any) : undefined,
          },
        });
        dispatchResults.inApp = true;
      } catch (err: any) {
        this.logger.error(`Failed to record in-app notification: ${err.message}`);
        dispatchResults.errors.push(`In-App error: ${err.message}`);
      }
    }

    // 2. Email Dispatch (Customer and/or Staff)
    if (emailAllowed) {
      const emailRecipients: Array<{ to: string; name?: string | null }> = [];
      if (customerEmail) emailRecipients.push({ to: customerEmail, name: customerName });
      if (staffEmail && staffEmail !== customerEmail) emailRecipients.push({ to: staffEmail, name: staffName });

      for (const recipient of emailRecipients) {
        try {
          await this.smtpService.sendMail(organizationId, {
            to: recipient.to,
            subject: `[ORBIT] ${title}`,
            text: `${message}\n\nThis is an automated notification from ORBIT Enterprise Operations.`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FAF9F6;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                  <div style="background: #2563EB; color: white; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">O</div>
                  <span style="font-size: 18px; font-weight: 700; color: #1E293B; letter-spacing: -0.5px; margin-left: 8px;">ORBIT Enterprise Operations</span>
                </div>
                <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #E2E8F0;">
                  <span style="font-size: 11px; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px;">${category.replace(/_/g, ' ')}</span>
                  <h2 style="color: #0F172A; margin: 6px 0 14px 0; font-size: 18px; font-weight: 600;">${title}</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-line;">${message}</p>
                  ${
                    metadata
                      ? `<div style="margin-top: 16px; padding: 12px; background: #F8FAFC; border-radius: 6px; font-size: 12px; color: #64748B;">
                          ${Object.entries(metadata)
                            .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
                            .join('')}
                        </div>`
                      : ''
                  }
                </div>
                <p style="font-size: 11px; color: #94A3B8; margin-top: 20px; text-align: center;">
                  ORBIT Operations Management System • Multi-channel notification engine
                </p>
              </div>
            `,
          });
          dispatchResults.emailSent = true;
        } catch (err: any) {
          this.logger.warn(`Failed to dispatch email for ${category}: ${err.message}`);
          dispatchResults.errors.push(`Email error: ${err.message}`);
        }
      }
    }

    // 3. WhatsApp Dispatch (Customer and/or Staff)
    if (whatsappAllowed) {
      if (customerPhone) {
        try {
          const waRes = await this.whatsAppService.sendMessage(
            organizationId,
            customerPhone,
            `📢 *ORBIT Operations Update*\n\n*${title}*\n\n${message}\n\n_Auto-dispatched via ORBIT Gateway_`,
            'CUSTOMER',
          );
          if (waRes.success) dispatchResults.whatsappSent = true;
        } catch (err: any) {
          this.logger.warn(`Failed to dispatch customer WhatsApp: ${err.message}`);
          dispatchResults.errors.push(`WhatsApp error: ${err.message}`);
        }
      }

      if (staffPhone) {
        try {
          const waRes = await this.whatsAppService.sendMessage(
            organizationId,
            staffPhone,
            `🛠️ *ORBIT Staff Alert: ${title}*\n\n${message}\n\n_Internal Operations Dispatch_`,
            'STAFF',
          );
          if (waRes.success) dispatchResults.whatsappSent = true;
        } catch (err: any) {
          this.logger.warn(`Failed to dispatch staff WhatsApp: ${err.message}`);
        }
      }
    }

    return dispatchResults;
  }

  /**
   * Fetch in-app notifications
   */
  async getInAppNotifications(organizationId: string, userId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inAppNotification.count({ where }),
      this.prisma.inAppNotification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return { items, total, unreadCount, page, limit };
  }

  /**
   * Mark a single in-app notification as read
   */
  async markInAppAsRead(organizationId: string, id: string) {
    return this.prisma.inAppNotification.updateMany({
      where: { id, organizationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all in-app notifications as read
   */
  async markAllInAppAsRead(organizationId: string, userId?: string) {
    const where = {
      organizationId,
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      isRead: false,
    };

    const res = await this.prisma.inAppNotification.updateMany({
      where,
      data: { isRead: true },
    });

    return { updatedCount: res.count };
  }

  /**
   * Test dispatch for admin verification
   */
  async testNotification(organizationId: string, dto: TestNotificationDto) {
    const categoryMeta =
      ENTERPRISE_NOTIFICATION_CATEGORIES.find((c) => c.category === dto.category) ||
      ENTERPRISE_NOTIFICATION_CATEGORIES[0];

    return this.dispatch(organizationId, {
      category: categoryMeta.category,
      title: `Verification Test: ${categoryMeta.label}`,
      message: `This is a live multi-channel test dispatched from the ORBIT Notification Engine for category "${categoryMeta.label}". All verified channels received this broadcast.`,
      customerEmail: dto.recipientEmail,
      customerPhone: dto.recipientPhone,
      metadata: {
        category: categoryMeta.category,
        dispatchedAt: new Date().toISOString(),
        testMode: true,
      },
    });
  }
}
