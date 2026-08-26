import { logger } from "../utils/logger";
import { TelegramUpdate } from "../types";
import { Assistant } from "../ai/assistant";
import { HandoffService } from "../services/handoff";
import { LeadService } from "../services/leads";
import { TelegramService } from "../services/telegram";
import { CommandHandler } from "./commands";

export class MessageHandler {
  private assistant: Assistant;
  private handoffService: HandoffService;
  private leadService: LeadService;
  private telegramService: TelegramService;
  private commandHandler: CommandHandler;
  private ownerTelegramId: string;

  constructor(
    assistant: Assistant,
    handoffService: HandoffService,
    leadService: LeadService,
    telegramService: TelegramService,
    commandHandler: CommandHandler,
    ownerTelegramId: string
  ) {
    this.assistant = assistant;
    this.handoffService = handoffService;
    this.leadService = leadService;
    this.telegramService = telegramService;
    this.commandHandler = commandHandler;
    this.ownerTelegramId = ownerTelegramId;
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.business_connection) {
        return;
      }

      const message = update.message || update.business_message;
      if (!message || !message.text) {
        return;
      }

      const chatId = message.chat.id;
      const text = message.text;
      const fromId = message.from?.id;

      if (text.startsWith("/") && fromId && String(fromId) === this.ownerTelegramId) {
        await this.commandHandler.handleCommand(chatId, text, fromId, update);
        return;
      }

      if (!this.handoffService.shouldRespond(chatId)) {
        logger.info("Automation paused for conversation, not responding", { chatId });
        return;
      }

      this.handoffService.addMessage(chatId, "user", text);

      const conversation = this.handoffService.getConversation(chatId);
      const aiResponse = await this.assistant.generateResponse(text, conversation);

      this.leadService.updateLead(
        chatId,
        aiResponse.leadClassification,
        aiResponse.leadIndicators
      );
      this.handoffService.updateLeadClassification(chatId, aiResponse.leadClassification);

      if (aiResponse.shouldHandoff) {
        this.handoffService.setConversationState(chatId, "HUMAN_HANDOFF");
        logger.info("Human handoff activated", { chatId, reason: "AI detected handoff trigger" });
      }

      const connectionId = conversation.businessConnectionId;
      const sent = await this.telegramService.sendMessage(chatId, aiResponse.text, connectionId);

      if (sent) {
        this.handoffService.addMessage(chatId, "assistant", aiResponse.text);
      }

      if (aiResponse.leadClassification === "HOT") {
        logger.info("HOT lead detected", { chatId, indicators: aiResponse.leadIndicators });
      }
    } catch (error) {
      logger.error("Error handling message update", { error: String(error) });
    }
  }
}
