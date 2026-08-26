import { logger } from "../utils/logger";
import { TelegramUpdate, TelegramMessage, BusinessConnection } from "../types";

export class TelegramService {
  private botToken: string;
  private apiBase: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
  }

  async setWebhook(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          allowed_updates: ["message", "business_connection", "business_message", "edited_business_message", "deleted_business_messages"],
        }),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      if (!data.ok) {
        logger.error("Failed to set webhook", { description: data.description });
        return false;
      }

      logger.info("Webhook set successfully", { url });
      return true;
    } catch (error) {
      logger.error("Error setting webhook", { error: String(error) });
      return false;
    }
  }

  async sendMessage(chatId: number, text: string, businessConnectionId?: string): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };

      if (businessConnectionId) {
        payload.business_connection_id = businessConnectionId;
      }

      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      if (!data.ok) {
        logger.error("Failed to send message", { chatId, description: data.description });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Error sending message", { error: String(error), chatId });
      return false;
    }
  }

  async getBusinessConnection(connectionId: string): Promise<BusinessConnection | null> {
    try {
      const response = await fetch(`${this.apiBase}/getBusinessConnection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_connection_id: connectionId }),
      });

      const data = await response.json() as {
        ok: boolean;
        result?: BusinessConnection;
        description?: string;
      };

      if (!data.ok) {
        logger.error("Failed to get business connection", { connectionId, description: data.description });
        return null;
      }

      return data.result || null;
    } catch (error) {
      logger.error("Error getting business connection", { error: String(error), connectionId });
      return null;
    }
  }

  async getMe(): Promise<{ ok: boolean; result?: { username: string } }> {
    try {
      const response = await fetch(`${this.apiBase}/getMe`);
      return await response.json() as { ok: boolean; result?: { username: string } };
    } catch (error) {
      logger.error("Error in getMe", { error: String(error) });
      return { ok: false };
    }
  }
}
