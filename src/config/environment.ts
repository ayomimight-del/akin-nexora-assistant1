import { logger } from "../utils/logger";

export interface EnvironmentConfig {
  botToken: string;
  ownerTelegramId: string;
  aiApiKey: string;
  aiApiUrl: string;
  aiModel: string;
  port: number;
  webhookUrl: string;
  maxContextMessages: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

function getEnvVar(name: string, required: boolean = true, defaultValue?: string): string {
  const value = process.env[name];
  if (required && !value) {
    logger.error(`Missing required environment variable: ${name}`);
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  return value || defaultValue || "";
}

function getEnvVarAsNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    logger.warn(`Invalid number for ${name}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export function loadEnvironment(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    botToken: getEnvVar("BOT_TOKEN"),
    ownerTelegramId: getEnvVar("OWNER_TELEGRAM_ID"),
    aiApiKey: getEnvVar("AI_API_KEY"),
    aiApiUrl: getEnvVar("AI_API_URL", false, "https://api.openai.com/v1/chat/completions"),
    aiModel: getEnvVar("AI_MODEL", false, "gpt-4o-mini"),
    port: getEnvVarAsNumber("PORT", 3000),
    webhookUrl: getEnvVar("WEBHOOK_URL"),
    maxContextMessages: getEnvVarAsNumber("MAX_CONTEXT_MESSAGES", 20),
    rateLimitWindowMs: getEnvVarAsNumber("RATE_LIMIT_WINDOW_MS", 10000),
    rateLimitMaxRequests: getEnvVarAsNumber("RATE_LIMIT_MAX_REQUESTS", 5),
  };

  logger.info("Environment configuration loaded successfully");
  return config;
}
