import { logger } from "../utils/logger";
import { LeadClassification } from "../types";
import { buildClassificationPrompt } from "./prompts";
import { EnvironmentConfig } from "../config/environment";

export interface ClassificationResult {
  intent: string;
  leadClassification: LeadClassification;
  leadIndicators: string[];
  shouldHandoff: boolean;
  confidence: number;
  serviceCategory: string;
}

export class Classifier {
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  async classify(message: string, conversationHistory: string): Promise<ClassificationResult> {
    try {
      const prompt = buildClassificationPrompt(message, conversationHistory);

      const response = await fetch(this.config.aiApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.aiApiKey}`,
        },
        body: JSON.stringify({
          model: this.config.aiModel,
          messages: [
            { role: "system", content: "You are a precise intent classifier. Respond only with valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 500,
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

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const result = JSON.parse(jsonStr) as ClassificationResult;

      if (!result.intent || typeof result.shouldHandoff !== "boolean") {
        throw new Error("Invalid classification response structure");
      }

      logger.info("Message classified", {
        intent: result.intent,
        leadClassification: result.leadClassification,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error("Classification failed", { error: String(error), message: message.substring(0, 100) });

      return {
        intent: "other",
        leadClassification: "UNCLASSIFIED",
        leadIndicators: [],
        shouldHandoff: false,
        confidence: 0,
        serviceCategory: "None",
      };
    }
  }
}
