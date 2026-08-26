import { logger } from "../utils/logger";
import { TelegramUpdate } from "../types";
import { HandoffService } from "../services/handoff";
import { TelegramService } from "../services/telegram";

export class BusinessHandler {
  private handoffService: HandoffService;
  private telegramService: TelegramService;

  constructor(handoffService: HandoffService, telegramService: TelegramService) {
    this.handoffService = handoffService;
    this.telegramService = telegramService;
  }

  async handleBusinessConnectionUpdate(update: TelegramUpdate): Promise<void> {
    const connection = update.business_connection;
    if (!connection) return;

    logger.info("Business connection update received", {
      connectionId: connection.id,
      userId: connection.user.id,
      canReply: connection.can_reply,
      isEnabled: connection.is_enabled,
    });

    if (!connection.is_enabled) {
      logger.warn("Business connection disabled or revoked", {
        connectionId: connection.id,
      });
    }
  }

  async handleBusinessMessage(update: TelegramUpdate): Promise<void> {
    const message = update.business_message;
    if (!message) return;

    const chatId = message.chat.id;
    const connectionId = message.business_connection_id;

    logger.info("Business message received", {
      chatId,
      connectionId,
      text: message.text?.substring(0, 100),
    });

    if (connectionId) {
      this.handoffService.setBusinessConnectionId(chatId, connectionId);
    }
  }

  async handleDeletedBusinessMessages(update: TelegramUpdate): Promise<void> {
    const deleted = update.deleted_business_messages;
    if (!deleted) return;

    logger.info("Business messages deleted", {
      connectionId: deleted.business_connection_id,
      chatId: deleted.chat.id,
      count: deleted.message_ids.length,
    });
  }
}
