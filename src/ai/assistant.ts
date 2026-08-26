import { logger } from "../utils/logger";
import { Conversation, AIResponse, LeadClassification } from "../types";
import { EnvironmentConfig } from "../config/environment";
import { buildSystemPrompt } from "./prompts";
import { Classifier } from "./classifier";

export class Assistant {
  private config: EnvironmentConfig;
  private classifier: Classifier;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.classifier = new Classifier(config);
  }

  async generateResponse(message: string, conversation: Conversation): Promise<AIResponse> {
    try {
      const historyStr = conversation.messages
        .slice(-this.config.maxContextMessages)
        .map((msg) => `${msg.role === "user" ? "Client" : "Assistant"}: ${msg.content}`)
        .join("\n");

      const classification = await this.classifier.classify(message, historyStr);

      if (classification.shouldHandoff) {
        return {
          text: "I understand. I'll leave this for Akin to handle personally.",
          shouldHandoff: true,
          leadClassification: classification.leadClassification,
          leadIndicators: classification.leadIndicators,
          confidence: classification.confidence,
        };
      }

      const systemPrompt = buildSystemPrompt();
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversation.messages
          .slice(-this.config.maxContextMessages)
          .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        { role: "user" as const, content: message },
      ];

      const response = await fetch(this.config.aiApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.aiApiKey}`,
        },
        body: JSON.stringify({
          model: this.config.aiModel,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        choices?: Array<{
          message?: { content?: string };
        }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI API");
      }

      const handoffPhrases = [
        "i'll leave this for Akin",
        "leave this for Akin",
        "Akin will handle",
        "hand this over to Akin",
      ];
      const responseIndicatesHandoff = handoffPhrases.some((phrase) =>
        content.toLowerCase().includes(phrase)
      );

      return {
        text: content.trim(),
        shouldHandoff: responseIndicatesHandoff || classification.shouldHandoff,
        leadClassification: classification.leadClassification,
        leadIndicators: classification.leadIndicators,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error("AI response generation failed", {
        error: String(error),
        chatId: conversation.chatId,
      });

      return {
        text: "I'm having trouble processing that right now. Please try again shortly, or I can leave this for Akin to handle.",
        shouldHandoff: false,
        leadClassification: "UNCLASSIFIED" as LeadClassification,
        leadIndicators: [],
        confidence: 0,
      };
    }
  }
}
