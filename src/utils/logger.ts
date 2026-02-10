import pino from 'pino';
import { config } from '../config/config';

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.client_email',
      'body.client_name',
      'body.address',
      'body.email',
      'body.phone'
    ],
    censor: '[REDACTED]'
  }
});
