import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdateWhatsAppConfigDto } from './dto/update-whatsapp-config.dto';
import { SendTestWhatsAppDto } from './dto/send-test-whatsapp.dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  // Default gateway parameters pointing to the deployed automation platform
  private readonly defaultApiUrl = 'https://nakshtraventures.in/wa-api';
  private readonly defaultApiKey = '429683C4C977415CAAFCCE10F7D57E11';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize any raw phone number into standard international format (digits only)
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    // If standard 10-digit Indian mobile number, prepend '91'
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    return digits;
  }

  /**
   * Get active WhatsApp configuration for an organization
   */
  async getConfig(organizationId: string) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        isConfigured: true,
        apiUrl: this.defaultApiUrl,
        apiKey: this.defaultApiKey,
        sessionName: 'default',
        isEnabled: true,
        notifyCustomer: true,
        notifyStaff: true,
        gatewayStatus: 'ONLINE',
      };
    }

    return {
      id: config.id,
      isConfigured: true,
      apiUrl: config.apiUrl || this.defaultApiUrl,
      apiKey: config.apiKey || this.defaultApiKey,
      sessionName: config.sessionName || 'default',
      isEnabled: config.isEnabled,
      notifyCustomer: config.notifyCustomer,
      notifyStaff: config.notifyStaff,
      gatewayStatus: config.isEnabled ? 'ONLINE' : 'PAUSED',
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Update WhatsApp gateway settings
   */
  async updateConfig(organizationId: string, dto: UpdateWhatsAppConfigDto) {
    return this.prisma.whatsAppConfig.upsert({
      where: { organizationId },
      update: {
        apiUrl: dto.apiUrl,
        apiKey: dto.apiKey,
        sessionName: dto.sessionName,
        isEnabled: dto.isEnabled ?? true,
        notifyCustomer: dto.notifyCustomer ?? true,
        notifyStaff: dto.notifyStaff ?? true,
      },
      create: {
        organizationId,
        apiUrl: dto.apiUrl || this.defaultApiUrl,
        apiKey: dto.apiKey || this.defaultApiKey,
        sessionName: dto.sessionName || 'default',
        isEnabled: dto.isEnabled ?? true,
        notifyCustomer: dto.notifyCustomer ?? true,
        notifyStaff: dto.notifyStaff ?? true,
      },
    });
  }

  /**
   * Low-level message sender through deployed WhatsApp Automation Gateway
   */
  async sendMessage(
    organizationId: string,
    phoneNumber: string,
    text: string,
    recipientType: 'CUSTOMER' | 'STAFF' = 'CUSTOMER',
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanNumber = this.normalizePhoneNumber(phoneNumber);
    if (!cleanNumber || cleanNumber.length < 10) {
      this.logger.warn(`Invalid phone number provided for WhatsApp alert: ${phoneNumber}`);
      return { success: false, error: 'Invalid phone number format' };
    }

    const config = await this.getConfig(organizationId);

    // Verify channel enablement
    if (!config.isEnabled) {
      this.logger.debug(`WhatsApp gateway is disabled for org: ${organizationId}`);
      return { success: false, error: 'Gateway disabled' };
    }

    if (recipientType === 'CUSTOMER' && !config.notifyCustomer) {
      this.logger.debug('Customer WhatsApp notifications are toggled off');
      return { success: false, error: 'Customer notifications disabled' };
    }

    if (recipientType === 'STAFF' && !config.notifyStaff) {
      this.logger.debug('Staff WhatsApp notifications are toggled off');
      return { success: false, error: 'Staff notifications disabled' };
    }

    const apiUrl = (config.apiUrl || this.defaultApiUrl).replace(/\/+$/, '');
    const apiKey = config.apiKey || this.defaultApiKey;

    try {
      this.logger.log(`Dispatching WhatsApp message to ${cleanNumber} via ${apiUrl}`);

      // Try /send/text first (standard deployed platform endpoint)
      const response = await fetch(`${apiUrl}/send/text`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cleanNumber,
          text,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        this.logger.log(`WhatsApp delivered to ${cleanNumber}: ${JSON.stringify(data)}`);
        return { success: true, messageId: data?.key?.id || data?.messageId || 'SENT' };
      }

      const errorText = await response.text();
      this.logger.warn(`Primary WhatsApp endpoint returned ${response.status}: ${errorText}`);

      // Secondary fallback endpoint for Evolution API /message/sendText
      try {
        const fallbackRes = await fetch(
          `${apiUrl}/message/sendText/${config.sessionName || 'default'}`,
          {
            method: 'POST',
            headers: {
              apikey: apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: cleanNumber,
              text,
            }),
          },
        );

        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as any;
          return { success: true, messageId: fallbackData?.key?.id || 'SENT' };
        }
        return { success: false, error: `WhatsApp gateway returned HTTP ${response.status}` };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr.message };
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to send WhatsApp message to ${cleanNumber}: ${err.message}`,
      );
      return { success: false, error: err.message };
    }
  }

  /**
   * Send a test message from admin settings
   */
  async sendTestMessage(organizationId: string, dto: SendTestWhatsAppDto) {
    const defaultMsg =
      `*ORBIT Enterprise Operations*\n\n` +
      `✅ WhatsApp Gateway Connected Successfully!\n` +
      `Platform: wa.nakshtraventures.in\n` +
      `Timestamp: ${new Date().toLocaleString('en-IN')}\n\n` +
      `Real-time operational alerts are now active for service desk tickets, technician dispatches, and OTP verifications.`;

    const textToSend = dto.customMessage ? `*ORBIT Alert*\n\n${dto.customMessage}` : defaultMsg;

    const result = await this.sendMessage(organizationId, dto.phoneNumber, textToSend, 'STAFF');

    if (!result.success) {
      throw new BadRequestException(
        result.error || 'Failed to dispatch test WhatsApp alert. Please verify your phone number and gateway API key.',
      );
    }

    return {
      success: true,
      recipient: this.normalizePhoneNumber(dto.phoneNumber),
      message: 'Test message delivered via WhatsApp gateway',
      messageId: result.messageId,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Contextual Workflow Notification Handlers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Trigger 1: Customer Ticket Created
   */
  async notifyTicketCreated(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone: string;
      ticketNumber: string;
      title: string;
      priority: string;
    },
  ) {
    const text =
      `*Service Request Acknowledged — ORBIT*\n\n` +
      `Hello ${data.customerName},\n` +
      `Your service incident has been logged successfully.\n\n` +
      `📋 *Ticket #:* ${data.ticketNumber}\n` +
      `📌 *Subject:* ${data.title}\n` +
      `⚡ *Priority:* ${data.priority}\n\n` +
      `Our service desk team has initiated triage and an engineer will be scheduled shortly.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * Trigger 2: Field Technician Assigned (Staff Alert)
   */
  async notifyTechAssigned(
    organizationId: string,
    data: {
      techName: string;
      techPhone: string;
      workOrderNumber: string;
      customerName: string;
      customerPhone: string;
      address: string;
      city: string;
      title: string;
    },
  ) {
    const text =
      `*New Work Order Assigned — Field Console*\n\n` +
      `Hi ${data.techName},\n` +
      `You have been assigned to Field Work Order *#${data.workOrderNumber}*.\n\n` +
      `🎯 *Task:* ${data.title}\n` +
      `👤 *Customer:* ${data.customerName} (${data.customerPhone})\n` +
      `📍 *Site Address:* ${data.address}, ${data.city}\n\n` +
      `Please accept the dispatch in your Field Console and proceed to location.`;

    return this.sendMessage(organizationId, data.techPhone, text, 'STAFF');
  }

  /**
   * Trigger 3: Technician Dispatched to Customer (Consumer Alert)
   */
  async notifyCustomerTechnicianDispatched(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone: string;
      techName: string;
      techPhone: string;
      workOrderNumber: string;
      timeSlot?: string;
    },
  ) {
    const text =
      `*Technician En Route — ORBIT Field Service*\n\n` +
      `Hello ${data.customerName},\n` +
      `Certified Field Engineer *${data.techName}* has departed for your service visit under Work Order *#${data.workOrderNumber}*.\n\n` +
      `⏰ *Estimated Window:* ${data.timeSlot || 'Next 60-90 minutes'}\n` +
      `📞 *Technician Contact:* ${data.techPhone || 'Direct via portal'}\n\n` +
      `Please keep the hardware asset accessible. You will receive an OTP code to verify repair completion.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * Trigger 4: Completion OTP to Customer (Fraud-Proof Repair Closure)
   */
  async notifyCustomerOtp(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone: string;
      otpCode: string;
      workOrderNumber: string;
    },
  ) {
    const text =
      `*Security OTP for Service Verification — ORBIT*\n\n` +
      `Hello ${data.customerName},\n` +
      `Your repair under Work Order *#${data.workOrderNumber}* is reported complete.\n\n` +
      `🔐 *Verification OTP:* *${data.otpCode}*\n\n` +
      `⚠️ Share this OTP with the engineer ONLY after confirming that the equipment has been repaired and verified in your presence.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * Trigger 5: Invoice Generated & Payment Receipt
   */
  async notifyCustomerInvoice(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone: string;
      invoiceNumber: string;
      totalAmount: number;
      isWarrantyCovered?: boolean;
    },
  ) {
    const formattedAmount = Number(data.totalAmount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });

    const statusNote = data.isWarrantyCovered
      ? `🛡️ *Warranty Covered:* 100% absorbed under active OEM warranty (₹0.00 payable)`
      : `💳 *Amount Due:* ${formattedAmount}`;

    const text =
      `*Service Invoice Issued — ORBIT Finance*\n\n` +
      `Hello ${data.customerName},\n` +
      `The invoice for your recent service engagement is ready.\n\n` +
      `📄 *Invoice #:* ${data.invoiceNumber}\n` +
      `${statusNote}\n\n` +
      `Thank you for choosing ORBIT Enterprise Operations.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }
}
