import express from 'express';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config/config';
import { logger } from './utils/logger';
import { verifyTwilioSignature } from './utils/twilio';
import { handleOpenClawEvent } from './services/skillHandler';
import { query } from './db';
import { OpenClawEvent } from './openclaw/types';

export const createApp = () => {
  const app = express();
  app.use(pinoHttp({ logger }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30
  });
  app.use('/webhooks', limiter);

  app.use('/webhooks/twilio/whatsapp', express.urlencoded({ extended: false }));
  app.use('/webhooks/pandadoc', express.json({ limit: '1mb' }));

  app.post('/webhooks/twilio/whatsapp', async (req, res) => {
    const signature = req.get('X-Twilio-Signature');
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body as Record<string, string>;

    const valid = verifyTwilioSignature(config.twilio.webhookAuthToken, signature, url, params);
    if (!valid) {
      res.status(403).send('Invalid signature');
      return;
    }

    const sender = params.From;
    const body = params.Body;
    const messageSid = params.MessageSid;

    const event: OpenClawEvent = {
      channel: 'WHATSAPP',
      conversation_key: messageSid,
      sender_id: sender,
      text: body,
      ts: Date.now(),
      metadata: params
    };

    res.status(200).send('');
    setImmediate(async () => {
      await handleOpenClawEvent(event);
    });
  });

  app.post('/webhooks/pandadoc', async (req, res) => {
    const payload = req.body as Record<string, any>;
    const documentId = payload?.data?.id ?? payload?.id;
    const status = payload?.data?.status ?? payload?.status;

    if (documentId && status) {
      await query('UPDATE proposals SET status = $1, updated_at = NOW() WHERE pandadoc_document_id = $2', [
        status,
        documentId
      ]);
    }

    await query(
      'INSERT INTO audit_log (salesperson_id, action, entity_type, entity_id, channel, metadata_json) VALUES ($1, $2, $3, $4, $5, $6)',
      [null, 'PANDADOC_WEBHOOK', 'proposal', documentId ?? 'unknown', 'WHATSAPP', payload]
    );

    res.status(200).json({ ok: true });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};
