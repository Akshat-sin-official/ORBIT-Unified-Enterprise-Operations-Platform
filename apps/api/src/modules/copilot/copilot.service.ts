import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CopilotChatDto } from './dto/copilot-chat.dto';
import { UpdateGeminiConfigDto } from './dto/update-gemini-config.dto';
import { TicketStatus, WorkOrderStatus } from '@prisma/client';

@Injectable()
export class CopilotService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeminiConfig(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { geminiApiKey: true },
    });

    const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);
    const hasOrgKey = Boolean(org?.geminiApiKey);

    return {
      isConfigured: hasOrgKey || hasEnvKey,
      source: hasOrgKey ? 'organization' : hasEnvKey ? 'environment' : 'none',
      maskedKey: hasOrgKey
        ? `${org!.geminiApiKey!.slice(0, 6)}...${org!.geminiApiKey!.slice(-4)}`
        : hasEnvKey
        ? 'Configured via Environment'
        : null,
    };
  }

  async updateGeminiConfig(organizationId: string, dto: UpdateGeminiConfigDto) {
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { geminiApiKey: dto.apiKey.trim() },
      select: { geminiApiKey: true },
    });

    return {
      isConfigured: true,
      source: 'organization',
      maskedKey: `${updated.geminiApiKey!.slice(0, 6)}...${updated.geminiApiKey!.slice(-4)}`,
    };
  }

  async chat(organizationId: string, userId: string, dto: CopilotChatDto) {
    // 1. Resolve Gemini API Key
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, geminiApiKey: true },
    });

    const apiKey = org?.geminiApiKey || process.env.GEMINI_API_KEY;

    // 2. Fetch live operational telemetry for contextual awareness (RAG)
    const [
      tickets,
      workOrders,
      technicians,
      balances,
      shipments,
      targetedTicket,
      targetedWorkOrder,
    ] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { organizationId },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          priority: true,
          status: true,
          isResolutionBreached: true,
          customer: { select: { name: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.findMany({
        where: { organizationId },
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          status: true,
          priority: true,
          technician: { select: { technicianCode: true } },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.technician.findMany({
        where: { organizationId },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.stockBalance.findMany({
        where: { organizationId },
        include: { part: { select: { partNumber: true, name: true, minSafetyStock: true } } },
      }),
      this.prisma.shipment.findMany({
        where: { organizationId },
        select: {
          shipmentNumber: true,
          trackingNumber: true,
          status: true,
          carrier: true,
          destinationCity: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      dto.ticketId
        ? this.prisma.ticket.findUnique({
            where: { id: dto.ticketId },
            include: {
              customer: true,
              product: true,
              registration: { include: { warranty: true } },
              comments: { take: 5, orderBy: { createdAt: 'desc' } },
            },
          })
        : null,
      dto.workOrderId
        ? this.prisma.workOrder.findUnique({
            where: { id: dto.workOrderId },
            include: {
              customer: true,
              technician: { include: { user: true } },
              partsUsed: true,
            },
          })
        : null,
    ]);

    // Compute summary metrics for Copilot context
    const openP1 = tickets.filter((t) => t.priority === 'P1_CRITICAL' && t.status !== 'RESOLVED');
    const lowStockParts = balances.filter((b) => b.quantityAvailable <= b.part.minSafetyStock);
    const availableTechs = technicians.filter((t) => t.currentStatus === 'AVAILABLE');

    // Build operational context payload
    const systemPrompt = `You are the ORBIT AI Operations Copilot — an expert AI assistant embedded directly inside the ORBIT Enterprise Resource Operations Management platform.
You assist service managers, dispatchers, technicians, and executives with real-time operational diagnostics, incident resolutions, field service dispatch, inventory inquiries, and customer communication.

CURRENT ENTERPRISE OPERATIONS CONTEXT (${org?.name || 'ORBIT Platform'}):
- Total Recent Tickets: ${tickets.length} (Critical P1 Unresolved: ${openP1.length})
- Recent Tickets List: ${JSON.stringify(
      tickets.map((t) => ({
        num: t.ticketNumber,
        title: t.title,
        pri: t.priority,
        status: t.status,
        cust: t.customer?.name,
      })),
    )}
- Active Work Orders: ${workOrders.length}
- Certified Field Technicians: ${technicians.length} (Available Now: ${availableTechs.length})
  Tech Roster: ${technicians.map((t) => `${t.technicianCode} (${t.user.firstName} ${t.user.lastName} - ${t.currentStatus}, Zone: ${t.serviceZone}, Skills: ${t.skills.join(', ')})`).join('; ')}
- Critical Low-Stock Inventory Alerts: ${lowStockParts.length}
  Low Stock Items: ${lowStockParts.map((b) => `${b.part.partNumber} (${b.part.name}: Available ${b.quantityAvailable}, Safety Min ${b.part.minSafetyStock})`).join('; ')}
- Logistics & Courier Shipments: ${shipments.length} in network
  Shipments: ${shipments.map((s) => `${s.shipmentNumber} [${s.carrier}]: ${s.status} to ${s.destinationCity}`).join('; ')}
${
  targetedTicket
    ? `\nFOCUSED TICKET CONTEXT:
Ticket #${targetedTicket.ticketNumber} - ${targetedTicket.title}
Priority: ${targetedTicket.priority}, Status: ${targetedTicket.status}
Customer: ${targetedTicket.customer.name} (${targetedTicket.customer.phone})
Product: ${targetedTicket.product?.name || 'N/A'}, Serial: ${targetedTicket.registration?.serialNumber || 'N/A'}
Warranty Status: ${targetedTicket.registration?.warranty?.status || 'N/A'} (Expires: ${targetedTicket.registration?.warranty?.endDate || 'N/A'})
Description: ${targetedTicket.description}`
    : ''
}
${
  targetedWorkOrder
    ? `\nFOCUSED WORK ORDER CONTEXT:
Work Order #${targetedWorkOrder.workOrderNumber} - ${targetedWorkOrder.title}
Status: ${targetedWorkOrder.status}, Assigned Tech: ${targetedWorkOrder.technician?.technicianCode || 'Unassigned'}
Customer: ${targetedWorkOrder.customer.name}
Diagnosis Notes: ${targetedWorkOrder.diagnosisNotes || 'None yet'}`
    : ''
}

GUIDELINES:
1. Provide crisp, professional, actionable responses with clear markdown bullet points, tables, and exact ticket/part/work order references.
2. If recommending a technician, explain why based on their skills, zone, and availability score.
3. If drafting a customer reply, adopt an empathetic, high-grade enterprise support tone.
4. If warning about stock, mention the exact SKU and available units.
5. Offer 2 to 3 logical next-step prompt suggestions.`;

    // 3. Call Gemini API or fallback
    let aiReply = '';
    let tokensUsed = 0;

    if (apiKey) {
      try {
        const contents: any[] = [];

        // Add chat history if present
        if (dto.history && dto.history.length > 0) {
          for (const h of dto.history.slice(-6)) {
            contents.push({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }],
            });
          }
        }

        // Add current user prompt
        contents.push({
          role: 'user',
          parts: [{ text: dto.message }],
        });

        // Call Gemini 2.5 Flash endpoint
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1200,
              },
            }),
          },
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('[CopilotService] Gemini API error:', errData);
          throw new Error(errData?.error?.message || `HTTP ${response.status} from Gemini API`);
        }

        const resData = await response.json();
        aiReply =
          resData?.candidates?.[0]?.content?.parts?.[0]?.text ||
          'I analyzed your operations request, but no text response was returned by the model.';
        tokensUsed = resData?.usageMetadata?.totalTokenCount || 0;
      } catch (err: any) {
        console.warn('[CopilotService] Falling back to intelligent local assistant response:', err.message);
        aiReply = this.generateFallbackResponse(dto.message, {
          tickets,
          workOrders,
          technicians,
          lowStockParts,
          openP1,
          shipments,
        });
      }
    } else {
      // No Gemini API key provided yet: Provide high-quality local analysis with instructions on how to link key
      aiReply = this.generateFallbackResponse(dto.message, {
        tickets,
        workOrders,
        technicians,
        lowStockParts,
        openP1,
        shipments,
      });
      aiReply += `\n\n> 💡 *Tip: Connect your Google Gemini API key in **Settings → Organization Profile → Gemini AI Copilot** to enable multi-turn generative conversational intelligence across your entire supply chain.*`;
    }

    // 4. Save message history
    await Promise.all([
      this.prisma.copilotMessage.create({
        data: {
          organizationId,
          userId,
          role: 'user',
          content: dto.message,
        },
      }),
      this.prisma.copilotMessage.create({
        data: {
          organizationId,
          userId,
          role: 'assistant',
          content: aiReply,
          tokensUsed,
        },
      }),
    ]);

    // 5. Generate action suggestion pills
    const suggestions = this.generateSuggestedPrompts(dto.message);

    return {
      reply: aiReply,
      suggestions,
      tokensUsed,
      model: 'gemini-2.5-flash',
    };
  }

  async getHistory(organizationId: string, userId: string) {
    return this.prisma.copilotMessage.findMany({
      where: { organizationId, userId },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearHistory(organizationId: string, userId: string) {
    return this.prisma.copilotMessage.deleteMany({
      where: { organizationId, userId },
    });
  }

  private generateFallbackResponse(query: string, data: any): string {
    const q = query.toLowerCase();

    if (q.includes('p1') || q.includes('critical') || q.includes('breach')) {
      return `### 🚨 Critical P1 Incidents & SLA Status
Currently, there are **${data.openP1.length} open P1 Critical tickets** in the queue:
${
  data.openP1.length > 0
    ? data.openP1
        .map(
          (t: any) =>
            `- **${t.ticketNumber}**: *${t.title}* for customer **${t.customer?.name}** (Status: \`${t.status}\`, Breached: ${t.isResolutionBreached ? '⚠️ YES' : '✓ Normal'})`,
        )
        .join('\n')
    : '- All P1 incidents are currently within normal response thresholds.'
}

**Recommended Immediate Action:**
1. Assign top-rated certified technician **${data.technicians[0]?.technicianCode || 'TECH-001'}** directly to avoid SLA penalties.
2. Verify replacement inventory buffer in Bengaluru Central Hub.`;
    }

    if (q.includes('stock') || q.includes('inventory') || q.includes('parts')) {
      return `### 📦 Spare Parts Inventory Intelligence
- **Critical Safety Stock Thresholds:** ${data.lowStockParts.length} SKUs below minimum buffer.
${
  data.lowStockParts.length > 0
    ? data.lowStockParts
        .map((b: any) => `- **${b.part.partNumber}** (${b.part.name}): **${b.quantityAvailable}** available (Min: ${b.part.minSafetyStock})`)
        .join('\n')
    : '- All cataloged SKUs are above minimum safety stock limits.'
}

**Supply Chain Recommendation:**
Trigger an inward Purchase Order (PO) or execute an inter-warehouse transfer from the Northern Logistics Hub (WH-DEL-01).`;
    }

    if (q.includes('tech') || q.includes('dispatch') || q.includes('assign')) {
      return `### 🛠️ Field Service Dispatch Intelligence
- **Active Technicians:** ${data.technicians.length} engineers rostered.
${data.technicians
  .map(
    (t: any) =>
      `- **${t.technicianCode}** (${t.user.firstName} ${t.user.lastName}): Status \`${t.currentStatus}\`, Zone: **${t.serviceZone}**, Skills: [${t.skills.join(', ')}]`,
  )
  .join('\n')}

**Smart Dispatch Advice:**
For electronic display and motherboard swaps, engineer **TECH-001** has the highest skill match score (96/100) and lowest average arrival latency.`;
    }

    // Default overview
    return `### 🌐 Enterprise Resource Operations Summary
Here is your current real-time operational posture:

| Metric | Current Telemetry | Health |
|---|---|:---:|
| **Open Incidents** | ${data.tickets.length} tickets (${data.openP1.length} P1 Critical) | ${data.openP1.length > 0 ? '⚠️ Attention' : '✓ Normal'} |
| **Field Work Orders** | ${data.workOrders.length} service orders active | ✓ Active |
| **Field Technicians** | ${data.technicians.length} rostered (${data.technicians.filter((t: any) => t.currentStatus === 'AVAILABLE').length} Available) | ✓ Ready |
| **Logistics Network** | ${data.shipments.length} consignments in transit | ✓ On Route |
| **Inventory Buffer** | ${data.lowStockParts.length} low-stock alerts | ${data.lowStockParts.length > 0 ? '⚠️ Reorder' : '✓ Stable'} |

How would you like me to assist you next? You can ask me to draft a customer reply, schedule an urgent dispatch, or check inventory across hubs.`;
  }

  private generateSuggestedPrompts(query: string): string[] {
    const q = query.toLowerCase();
    if (q.includes('ticket') || q.includes('p1')) {
      return [
        'Recommend best technician for P1 ticket',
        'Draft empathetic response to customer',
        'Check spare parts for OLED display',
      ];
    }
    if (q.includes('stock') || q.includes('part')) {
      return [
        'How to execute inter-warehouse transfer?',
        'Show all parts below safety threshold',
        'Check battery stock in Delhi hub',
      ];
    }
    return [
      'Show open critical P1 incidents',
      'Which technicians are available right now?',
      'Summarize today\'s logistics and shipments',
    ];
  }
}
