import { logger } from "../utils/logger";
import { Conversation, ConversationState, ConversationMessage, LeadClassification } from "../types";

export class HandoffService {
  private conversations: Map<number, Conversation> = new Map();
  private globalPaused: boolean = false;

  getConversation(chatId: number): Conversation {
    let conversation = this.conversations.get(chatId);
    if (!conversation) {
      const now = Date.now();
      conversation = {
        chatId,
        messages: [],
        state: "ACTIVE",
        leadClassification: "UNCLASSIFIED",
        lastActivity: now,
        createdAt: now,
      };
      this.conversations.set(chatId, conversation);
    }
    return conversation;
  }

  addMessage(chatId: number, role: "user" | "assistant", content: string): Conversation {
    const conversation = this.getConversation(chatId);
    const message: ConversationMessage = {
      role,
      content,
      timestamp: Date.now(),
    };

    conversation.messages.push(message);
    conversation.lastActivity = Date.now();

    return conversation;
  }

  setConversationState(chatId: number, state: ConversationState): void {
    const conversation = this.getConversation(chatId);
    const oldState = conversation.state;
    conversation.state = state;

    logger.info("Conversation state changed", {
      chatId,
      oldState,
      newState: state,
    });
  }

  getConversationState(chatId: number): ConversationState {
    return this.getConversation(chatId).state;
  }

  setBusinessConnectionId(chatId: number, connectionId: string): void {
    const conversation = this.getConversation(chatId);
    conversation.businessConnectionId = connectionId;
  }

  updateLeadClassification(chatId: number, classification: LeadClassification): void {
    const conversation = this.getConversation(chatId);
    conversation.leadClassification = classification;
  }

  isGloballyPaused(): boolean {
    return this.globalPaused;
  }

  setGlobalPaused(paused: boolean): void {
    this.globalPaused = paused;
    logger.info(`Global automation ${paused ? "PAUSED" : "RESUMED"}`);
  }

  shouldRespond(chatId: number): boolean {
    if (this.globalPaused) {
      return false;
    }
    const state = this.getConversationState(chatId);
    return state === "ACTIVE";
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  getActiveConversations(): Conversation[] {
    return this.getAllConversations().filter((c) => c.state === "ACTIVE");
  }

  getHandoffConversations(): Conversation[] {
    return this.getAllConversations().filter((c) => c.state === "HUMAN_HANDOFF");
  }

  getStats(): {
    total: number;
    active: number;
    paused: number;
    handoff: number;
    globalStatus: string;
  } {
    const all = this.getAllConversations();
    return {
      total: all.length,
      active: all.filter((c) => c.state === "ACTIVE").length,
      paused: all.filter((c) => c.state === "PAUSED").length,
      handoff: all.filter((c) => c.state === "HUMAN_HANDOFF").length,
      globalStatus: this.globalPaused ? "PAUSED" : "ACTIVE",
    };
  }
}
