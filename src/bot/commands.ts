import { logger } from "../utils/logger";
import { TelegramUpdate } from "../types";
import { HandoffService } from "../services/handoff";
import { LeadService } from "../services/leads";
import { TelegramService } from "../services/telegram";

export class CommandHandler {
  private handoffService: HandoffService;
  private leadService: LeadService;
  private telegramService: TelegramService;
  private ownerTelegramId: string;

  constructor(
    handoffService: HandoffService,
    leadService: LeadService,
    telegramService: TelegramService,
    ownerTelegramId: string
  ) {
    this.handoffService = handoffService;
    this.leadService = leadService;
    this.telegramService = telegramService;
    this.ownerTelegramId = ownerTelegramId;
  }

  async handleCommand(
    chatId: number,
    text: string,
    fromId: number,
    _update: TelegramUpdate
  ): Promise<void> {
    if (String(fromId) !== this.ownerTelegramId) {
      logger.warn("Unauthorized command attempt", { fromId, command: text });
      return;
    }

    const command = text.split(" ")[0].toLowerCase();
    const args = text.split(" ").slice(1);

    logger.info("Admin command received", { command, fromId });

    switch (command) {
      case "/admin":
        await this.handleAdmin(chatId);
        break;
      case "/status":
        await this.handleStatus(chatId);
        break;
      case "/pause":
        await this.handlePause(chatId);
        break;
      case "/resume":
        await this.handleResume(chatId);
        break;
      case "/leads":
        await this.handleLeads(chatId, args);
        break;
      case "/lead":
        await this.handleLead(chatId, args);
        break;
      case "/stats":
        await this.handleStats(chatId);
        break;
      case "/handoff":
        await this.handleHandoff(chatId, args);
        break;
      case "/resume_chat":
        await this.handleResumeChat(chatId, args);
        break;
      case "/settings":
        await this.handleSettings(chatId);
        break;
      case "/help":
        await this.handleHelp(chatId);
        break;
      default:
        await this.telegramService.sendMessage(
          chatId,
          "Unknown command. Use /help to see available commands."
        );
    }
  }

  private async handleAdmin(chatId: number): Promise<void> {
    const message = `<b>Akin Nexora Assistant — Admin Panel</b>\n\nYou are the owner. Available commands:\n\n/status — System status\n/pause — Pause all automation\n/resume — Resume all automation\n/leads — List all leads\n/leads HOT — List hot leads\n/lead [chatId] — View specific lead\n/stats — Conversation statistics\n/handoff [chatId] — Manually handoff a chat\n/resume_chat [chatId] — Resume a specific chat\n/settings — Current settings\n/help — This help message`;
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleStatus(chatId: number): Promise<void> {
    const stats = this.handoffService.getStats();
    const message = `<b>System Status</b>\n\nGlobal Status: ${stats.globalStatus}\nTotal Conversations: ${stats.total}\nActive: ${stats.active}\nPaused: ${stats.paused}\nHuman Handoff: ${stats.handoff}\n\nBot: @AkinNexoraBot\nAssistant: Akin Nexora Assistant`;
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handlePause(chatId: number): Promise<void> {
    this.handoffService.setGlobalPaused(true);
    await this.telegramService.sendMessage(
      chatId,
      "✅ Global automation PAUSED. The assistant will stop responding to all conversations. Admin commands still work."
    );
  }

  private async handleResume(chatId: number): Promise<void> {
    this.handoffService.setGlobalPaused(false);
    await this.telegramService.sendMessage(
      chatId,
      "✅ Global automation RESUMED. The assistant is now active."
    );
  }

  private async handleLeads(chatId: number, args: string[]): Promise<void> {
    let leads;
    if (args.length > 0) {
      const classification = args[0].toUpperCase();
      if (["HOT", "WARM", "COLD", "NOT_A_MATCH"].includes(classification)) {
        leads = this.leadService.getLeadsByClassification(
          classification as "HOT" | "WARM" | "COLD" | "NOT_A_MATCH"
        );
      } else {
        await this.telegramService.sendMessage(
          chatId,
          "Invalid classification. Use: HOT, WARM, COLD, or NOT_A_MATCH"
        );
        return;
      }
    } else {
      leads = this.leadService.getAllLeads();
    }

    const summary = this.leadService.formatLeadsList(leads);
    const message = `<b>Leads (${leads.length})</b>\n\n${summary}`;
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleLead(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.telegramService.sendMessage(chatId, "Usage: /lead [chatId]");
      return;
    }

    const targetChatId = parseInt(args[0], 10);
    if (isNaN(targetChatId)) {
      await this.telegramService.sendMessage(chatId, "Invalid chat ID.");
      return;
    }

    const lead = this.leadService.getLead(targetChatId);
    if (!lead) {
      await this.telegramService.sendMessage(chatId, `No lead found for chat ID ${targetChatId}.`);
      return;
    }

    const message = this.leadService.formatLeadSummary(lead);
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleStats(chatId: number): Promise<void> {
    const stats = this.handoffService.getStats();
    const allLeads = this.leadService.getAllLeads();
    const hotLeads = allLeads.filter((l) => l.classification === "HOT").length;

    const message = `<b>Statistics</b>\n\nConversations:\n• Total: ${stats.total}\n• Active: ${stats.active}\n• Paused: ${stats.paused}\n• Handoff: ${stats.handoff}\n\nLeads:\n• Total: ${allLeads.length}\n• HOT: ${hotLeads}\n• WARM: ${allLeads.filter((l) => l.classification === "WARM").length}\n• COLD: ${allLeads.filter((l) => l.classification === "COLD").length}\n\nGlobal: ${stats.globalStatus}`;
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleHandoff(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.telegramService.sendMessage(chatId, "Usage: /handoff [chatId]");
      return;
    }

    const targetChatId = parseInt(args[0], 10);
    if (isNaN(targetChatId)) {
      await this.telegramService.sendMessage(chatId, "Invalid chat ID.");
      return;
    }

    this.handoffService.setConversationState(targetChatId, "HUMAN_HANDOFF");
    await this.telegramService.sendMessage(
      chatId,
      `Chat ${targetChatId} set to HUMAN_HANDOFF. The assistant will no longer auto-reply.`
    );
  }

  private async handleResumeChat(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.telegramService.sendMessage(chatId, "Usage: /resume_chat [chatId]");
      return;
    }

    const targetChatId = parseInt(args[0], 10);
    if (isNaN(targetChatId)) {
      await this.telegramService.sendMessage(chatId, "Invalid chat ID.");
      return;
    }

    this.handoffService.setConversationState(targetChatId, "ACTIVE");
    await this.telegramService.sendMessage(
      chatId,
      `Chat ${targetChatId} set to ACTIVE. The assistant will resume auto-replies.`
    );
  }

  private async handleSettings(chatId: number): Promise<void> {
    const message = `<b>Current Settings</b>\n\nOwner ID: ${this.ownerTelegramId}\nMax Context Messages: ${process.env.MAX_CONTEXT_MESSAGES || "20"}\nRate Limit Window: ${process.env.RATE_LIMIT_WINDOW_MS || "10000"}ms\nRate Limit Max: ${process.env.RATE_LIMIT_MAX_REQUESTS || "5"}\n\nNote: Change settings via Railway environment variables.`;
    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleHelp(chatId: number): Promise<void> {
    const message = `<b>Admin Commands</b>\n\n/admin — Admin panel\n/status — System status\n/pause — Pause all automation\n/resume — Resume all automation\n/leads — List all leads\n/leads HOT — Filter by classification\n/lead [chatId] — View lead details\n/stats — Full statistics\n/handoff [chatId] — Manual handoff\n/resume_chat [chatId] — Resume chat\n/settings — Current settings\n/help — This message`;
    await this.telegramService.sendMessage(chatId, message);
  }
}
