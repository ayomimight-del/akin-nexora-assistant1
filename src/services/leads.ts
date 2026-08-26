import { logger } from "../utils/logger";
import { Lead, LeadClassification } from "../types";

export class LeadService {
  private leads: Map<number, Lead> = new Map();

  getLead(chatId: number): Lead | undefined {
    return this.leads.get(chatId);
  }

  updateLead(
    chatId: number,
    classification: LeadClassification,
    indicators: string[],
    requirements?: Record<string, string>
  ): Lead {
    const existing = this.leads.get(chatId);
    const now = Date.now();

    const lead: Lead = {
      chatId,
      classification,
      indicators: [...new Set([...(existing?.indicators || []), ...indicators])],
      collectedRequirements: {
        ...(existing?.collectedRequirements || {}),
        ...(requirements || {}),
      },
      firstContact: existing?.firstContact || now,
      lastContact: now,
      messageCount: (existing?.messageCount || 0) + 1,
    };

    this.leads.set(chatId, lead);

    logger.info("Lead updated", {
      chatId,
      classification: lead.classification,
      messageCount: lead.messageCount,
    });

    return lead;
  }

  getAllLeads(): Lead[] {
    return Array.from(this.leads.values());
  }

  getLeadsByClassification(classification: LeadClassification): Lead[] {
    return this.getAllLeads().filter((l) => l.classification === classification);
  }

  formatLeadSummary(lead: Lead): string {
    const lines = [
      `<b>Lead #${lead.chatId}</b>`,
      `Classification: ${lead.classification}`,
      `Messages: ${lead.messageCount}`,
      `First contact: ${new Date(lead.firstContact).toLocaleString()}`,
      `Last contact: ${new Date(lead.lastContact).toLocaleString()}`,
    ];

    if (lead.indicators.length > 0) {
      lines.push(`Indicators: ${lead.indicators.join(", ")}`);
    }

    if (Object.keys(lead.collectedRequirements).length > 0) {
      lines.push("Requirements:");
      for (const [key, value] of Object.entries(lead.collectedRequirements)) {
        lines.push(`  • ${key}: ${value}`);
      }
    }

    return lines.join("\n");
  }

  formatLeadsList(leads: Lead[]): string {
    if (leads.length === 0) {
      return "No leads found.";
    }

    return leads
      .map((lead) => {
        const date = new Date(lead.lastContact).toLocaleDateString();
        return `• #${lead.chatId} — ${lead.classification} (${lead.messageCount} msgs, last: ${date})`;
      })
      .join("\n");
  }
}
