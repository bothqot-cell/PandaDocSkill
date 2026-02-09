import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  databaseUrl: requireEnv('DATABASE_URL'),
  pandadoc: {
    apiKey: requireEnv('PANDADOC_API_KEY'),
    baseUrl: process.env.PANDADOC_BASE_URL ?? 'https://api.pandadoc.com',
    defaultTemplateId: requireEnv('PANDADOC_TEMPLATE_ID')
  },
  twilio: {
    accountSid: requireEnv('TWILIO_ACCOUNT_SID'),
    authToken: requireEnv('TWILIO_AUTH_TOKEN'),
    whatsappFrom: requireEnv('TWILIO_WHATSAPP_FROM'),
    webhookAuthToken: requireEnv('TWILIO_WEBHOOK_AUTH_TOKEN')
  },
  llm: {
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini'
  },
  adminApiKey: requireEnv('ADMIN_API_KEY')
};
