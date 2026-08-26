export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  date: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  business_connection_id?: string;
}

export interface BusinessConnection {
  id: string;
  user: TelegramUser;
  user_chat_id: number;
  date: number;
  can_reply: boolean;
  is_enabled: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  business_connection?: BusinessConnection;
  business_message?: TelegramMessage;
  edited_business_message?: TelegramMessage;
  deleted_business_messages?: {
    business_connection_id: string;
    chat: TelegramChat;
    message_ids: number[];
  };
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type ConversationState = "ACTIVE" | "PAUSED" | "HUMAN_HANDOFF";
export type LeadClassification = "HOT" | "WARM" | "COLD" | "NOT_A_MATCH" | "UNCLASSIFIED";

export interface Conversation {
  chatId: number;
  businessConnectionId?: string;
  messages: ConversationMessage[];
  state: ConversationState;
  leadClassification: LeadClassification;
  lastActivity: number;
  createdAt: number;
}

export interface Lead {
  chatId: number;
  classification: LeadClassification;
  indicators: string[];
  collectedRequirements: Record<string, string>;
  firstContact: number;
  lastContact: number;
  messageCount: number;
}

export interface AIResponse {
  text: string;
  shouldHandoff: boolean;
  leadClassification: LeadClassification;
  leadIndicators: string[];
  confidence: number;
}

export interface AdminState {
  globalPaused: boolean;
  ownerTelegramId: string;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}
