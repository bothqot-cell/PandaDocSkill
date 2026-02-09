import twilio from 'twilio';
import { config } from '../config/config';
import { Channel } from '../openclaw/types';

export interface NotificationTarget {
  channel: Channel;
  external_id: string;
}

export class Notifier {
  private client = twilio(config.twilio.accountSid, config.twilio.authToken);

  async notify(target: NotificationTarget, message: string): Promise<void> {
    if (target.channel === 'WHATSAPP') {
      await this.client.messages.create({
        from: config.twilio.whatsappFrom,
        to: target.external_id,
        body: message
      });
      return;
    }
    if (target.channel === 'TELEGRAM') {
      return;
    }
  }
}
