import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface WhatsAppStatusResponse {
  isConnected: boolean;
  phoneNumber?: string;
  jid?: string;
  instanceName: string;
  instanceToken: string;
  notifyCustomer: boolean;
  notifyStaff: boolean;
  updatedAt?: Date;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  // WhatsFlow Go Engine defaults
  private readonly defaultApiUrl = 'https://nakshtraventures.in/wa-api';
  private readonly defaultGlobalApiKey = '429683C4C977415CAAFCCE10F7D57E11';
  private readonly defaultInstanceName = 'orbit';
  private readonly defaultInstanceToken = 'token_orbit_enterprise';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format any raw phone number into clean international digits (no +, -, or spaces)
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    return digits;
  }

  /**
   * Format JID (e.g. 919608505998:44@s.whatsapp.net) into human readable phone (+91 96085 05998)
   */
  formatJidToPhone(jid?: string | null): string {
    if (!jid) return '';
    const rawNumber = jid.split('@')[0].split(':')[0];
    if (rawNumber.length === 12 && rawNumber.startsWith('91')) {
      return `+91 ${rawNumber.slice(2, 7)} ${rawNumber.slice(7)}`;
    }
    return `+${rawNumber}`;
  }

  /**
   * Get or initialize WhatsApp configuration for an organization
   */
  async getOrCreateConfig(organizationId: string) {
    let config = await this.prisma.whatsAppConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      config = await this.prisma.whatsAppConfig.create({
        data: {
          organizationId,
          apiUrl: this.defaultApiUrl,
          apiKey: this.defaultGlobalApiKey,
          instanceName: this.defaultInstanceName,
          instanceToken: this.defaultInstanceToken,
          isConnected: false,
          isEnabled: true,
          notifyCustomer: true,
          notifyStaff: true,
        },
      });
    }

    return config;
  }

  /**
   * Query live status of WhatsApp instance from WhatsFlow engine
   */
  async getStatus(organizationId: string): Promise<WhatsAppStatusResponse> {
    const config = await this.getOrCreateConfig(organizationId);
    const apiUrl = (config.apiUrl || this.defaultApiUrl).replace(/\/+$/, '');
    const token = config.instanceToken || this.defaultInstanceToken;

    let isConnected = config.isConnected;
    let jid = config.jid || '';
    let phoneNumber = config.phoneNumber || '';

    try {
      // 1. Query instance status directly with instance token
      const statusRes = await fetch(`${apiUrl}/instance/status`, {
        method: 'GET',
        headers: { apikey: token },
      });

      if (statusRes.ok) {
        const json = (await statusRes.json()) as any;
        const data = json?.data || json;
        const loggedIn = Boolean(data?.LoggedIn || data?.connected || (data?.jid && data.jid.length > 0));
        
        if (data?.jid) {
          jid = data.jid;
          phoneNumber = this.formatJidToPhone(jid);
        }

        if (loggedIn !== isConnected) {
          isConnected = loggedIn;
          await this.prisma.whatsAppConfig.update({
            where: { organizationId },
            data: {
              isConnected,
              jid: jid || undefined,
              phoneNumber: phoneNumber || undefined,
            },
          });
        }
      }

      // 2. Cross-check with /instance/all to retrieve latest device jid if missing
      if (!jid || !isConnected) {
        const allRes = await fetch(`${apiUrl}/instance/all`, {
          method: 'GET',
          headers: { apikey: config.apiKey || this.defaultGlobalApiKey },
        });

        if (allRes.ok) {
          const allJson = (await allRes.json()) as any;
          const instances: any[] = allJson?.data || [];
          const matched = instances.find(
            (i) => i.name === config.instanceName || i.token === token || i.id === config.instanceId,
          );

          if (matched) {
            const matchedConnected = Boolean(matched.connected && matched.jid);
            if (matched.jid) {
              jid = matched.jid;
              phoneNumber = this.formatJidToPhone(jid);
            }
            if (matchedConnected !== isConnected) {
              isConnected = matchedConnected;
              await this.prisma.whatsAppConfig.update({
                where: { organizationId },
                data: {
                  isConnected,
                  jid: jid || undefined,
                  phoneNumber: phoneNumber || undefined,
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to poll WhatsFlow status: ${err.message}`);
    }

    return {
      isConnected,
      phoneNumber: phoneNumber || (jid ? this.formatJidToPhone(jid) : undefined),
      jid: jid || undefined,
      instanceName: config.instanceName,
      instanceToken: token,
      notifyCustomer: config.notifyCustomer,
      notifyStaff: config.notifyStaff,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Request pairing session and retrieve QR code image from WhatsFlow engine
   */
  async getPairingQr(organizationId: string): Promise<{ qrcode: string; isConnected: boolean }> {
    const config = await this.getOrCreateConfig(organizationId);
    const apiUrl = (config.apiUrl || this.defaultApiUrl).replace(/\/+$/, '');
    const token = config.instanceToken || this.defaultInstanceToken;

    // 1. Trigger /instance/connect to initiate WhatsApp companion pairing
    try {
      await fetch(`${apiUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          apikey: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    } catch (err: any) {
      this.logger.warn(`Connect call warning: ${err.message}`);
    }

    // 2. Fetch the base64 pairing QR Code
    const qrRes = await fetch(`${apiUrl}/instance/qr`, {
      method: 'GET',
      headers: { apikey: token },
    });

    if (!qrRes.ok) {
      const errText = await qrRes.text();
      this.logger.error(`Failed to fetch QR code: ${qrRes.status} ${errText}`);
      throw new BadRequestException('Failed to retrieve pairing QR from WhatsApp engine');
    }

    const qrJson = (await qrRes.json()) as any;
    const qrcode = qrJson?.data?.qrcode || qrJson?.qrcode || '';

    // Check status as well
    const status = await this.getStatus(organizationId);

    return {
      qrcode,
      isConnected: status.isConnected,
    };
  }

  /**
   * Disconnect or logout linked WhatsApp instance
   */
  async disconnect(organizationId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getOrCreateConfig(organizationId);
    const apiUrl = (config.apiUrl || this.defaultApiUrl).replace(/\/+$/, '');
    const token = config.instanceToken || this.defaultInstanceToken;

    try {
      await fetch(`${apiUrl}/instance/disconnect`, {
        method: 'POST',
        headers: { apikey: token },
      });
    } catch (err: any) {
      this.logger.warn(`Disconnect call warning: ${err.message}`);
    }

    await this.prisma.whatsAppConfig.update({
      where: { organizationId },
      data: {
        isConnected: false,
        jid: null,
        phoneNumber: null,
      },
    });

    return { success: true, message: 'WhatsApp device unlinked successfully' };
  }

  /**
   * Update notification preference toggles
   */
  async updatePreferences(
    organizationId: string,
    dto: { notifyCustomer?: boolean; notifyStaff?: boolean },
  ) {
    return this.prisma.whatsAppConfig.upsert({
      where: { organizationId },
      update: {
        ...(dto.notifyCustomer !== undefined && { notifyCustomer: dto.notifyCustomer }),
        ...(dto.notifyStaff !== undefined && { notifyStaff: dto.notifyStaff }),
      },
      create: {
        organizationId,
        apiUrl: this.defaultApiUrl,
        apiKey: this.defaultGlobalApiKey,
        instanceName: this.defaultInstanceName,
        instanceToken: this.defaultInstanceToken,
        notifyCustomer: dto.notifyCustomer ?? true,
        notifyStaff: dto.notifyStaff ?? true,
      },
    });
  }

  /**
   * Send text message through the linked WhatsApp instance
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

    const config = await this.getOrCreateConfig(organizationId);

    if (recipientType === 'CUSTOMER' && !config.notifyCustomer) {
      this.logger.debug('Customer WhatsApp notifications are toggled off');
      return { success: false, error: 'Customer notifications disabled' };
    }

    if (recipientType === 'STAFF' && !config.notifyStaff) {
      this.logger.debug('Staff WhatsApp notifications are toggled off');
      return { success: false, error: 'Staff notifications disabled' };
    }

    const apiUrl = (config.apiUrl || this.defaultApiUrl).replace(/\/+$/, '');
    const token = config.instanceToken || this.defaultInstanceToken;

    try {
      this.logger.log(`Dispatching WhatsApp message to ${cleanNumber} via token ${token}`);

      const response = await fetch(`${apiUrl}/send/text`, {
        method: 'POST',
        headers: {
          apikey: token,
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
      this.logger.warn(`WhatsFlow /send/text returned ${response.status}: ${errorText}`);

      // Fallback try with primary token if orbit token is not yet paired
      if (token !== 'token_primary_123456') {
        const fallbackRes = await fetch(`${apiUrl}/send/text`, {
          method: 'POST',
          headers: {
            apikey: 'token_primary_123456',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanNumber,
            text,
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as any;
          return { success: true, messageId: fallbackData?.key?.id || 'SENT' };
        }
      }

      return { success: false, error: `WhatsApp gateway returned HTTP ${response.status}: ${errorText}` };
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send test message
   */
  async sendTestMessage(
    organizationId: string,
    phoneNumber: string,
    customMessage?: string,
  ): Promise<{ success: boolean; message: string }> {
    const text =
      customMessage ||
      `🚀 *ORBIT Enterprise Operations*\n\nThis is a verified test notification from your linked WhatsApp Gateway.\nTime: ${new Date().toLocaleString('en-IN')}`;

    const res = await this.sendMessage(organizationId, phoneNumber, text, 'CUSTOMER');
    if (!res.success) {
      throw new BadRequestException(res.error || 'Failed to dispatch test WhatsApp message');
    }

    return {
      success: true,
      message: `Test message successfully dispatched to ${phoneNumber}`,
    };
  }

  // ─── Operational Notification Templates ─────────────────────────────────────

  /**
   * 1. Ticket Logged Customer Acknowledgment
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
      `👋 *Hello ${data.customerName}!* \n\n` +
      `Your support request *#${data.ticketNumber}* has been registered.\n` +
      `📌 *Issue:* ${data.title}\n` +
      `⚡ *Priority:* ${data.priority}\n\n` +
      `Our service desk team has received this and will assign a field engineer shortly. Thank you for choosing ORBIT Service Operations.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * 2. Field Technician Work Order Assignment
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
      city?: string;
      title: string;
    },
  ) {
    const location = data.city ? `${data.address}, ${data.city}` : data.address;
    const text =
      `🚨 *NEW WORK ORDER ASSIGNED*\n\n` +
      `Hi *${data.techName}*, you have been assigned to service order *#${data.workOrderNumber}*.\n\n` +
      `👤 *Customer:* ${data.customerName} (${data.customerPhone})\n` +
      `📍 *Site Address:* ${location}\n` +
      `🔧 *Problem:* ${data.title}\n\n` +
      `Please open your ORBIT Technician Mobile Portal to acknowledge transit.`;

    return this.sendMessage(organizationId, data.techPhone, text, 'STAFF');
  }

  /**
   * 3. Technician Dispatched / En-route Customer Notice
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
      trackingUrl?: string;
    },
  ) {
    const slot = data.timeSlot ? ` (${data.timeSlot})` : '';
    const trackingLine = data.trackingUrl
      ? `\n📍 *Live GPS Tracking & ETA:* ${data.trackingUrl}\n`
      : '';

    const text =
      `🚗 *Technician En Route*\n\n` +
      `Dear *${data.customerName}*, our certified field engineer *${data.techName}* is currently traveling to your site for work order *#${data.workOrderNumber}*${slot}.\n\n` +
      `📞 Engineer Phone: ${data.techPhone || 'Available via service desk'}\n` +
      trackingLine +
      `\nPlease ensure the equipment is accessible upon arrival.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * 4. Customer OTP Completion Verification
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
      `🔐 *ORBIT Service Verification OTP*\n\n` +
      `Dear *${data.customerName}*, repairs on order *#${data.workOrderNumber}* have been completed.\n\n` +
      `Your service sign-off OTP is: *${data.otpCode}*\n\n` +
      `Please share this OTP with your field technician only if you are completely satisfied with the repair.`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }

  /**
   * 5. Customer Invoice Generation Alert
   */
  async notifyCustomerInvoice(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone: string;
      invoiceNumber: string;
      totalAmount: number | string;
      currency?: string;
      isWarrantyCovered?: boolean;
    },
  ) {
    const curr = data.currency || 'INR';
    const amountStr = data.isWarrantyCovered
      ? `Covered Under Warranty (₹0 Payable)`
      : `${curr} ${Number(data.totalAmount).toLocaleString('en-IN')}`;

    const text =
      `📄 *Invoice Generated*\n\n` +
      `Dear *${data.customerName}*, invoice *#${data.invoiceNumber}* for *${amountStr}* has been generated for your recent service.\n\n` +
      `Thank you for your business!`;

    return this.sendMessage(organizationId, data.customerPhone, text, 'CUSTOMER');
  }
}
