import { query } from '../db';
import { Channel } from '../openclaw/types';

export interface RoutedMessage {
  salesperson_id: string;
  conversation_id: string;
  normalized_text: string;
}

export class ChannelRouter {
  async route(channel: Channel, senderId: string, conversationKey: string, text: string): Promise<RoutedMessage> {
    const binding = await query<{ salesperson_id: string }>(
      'SELECT salesperson_id FROM channel_bindings WHERE channel = $1 AND external_id = $2',
      [channel, senderId]
    );
    if (binding.rows.length === 0) {
      throw new Error('UNBOUND_SENDER');
    }
    const salespersonId = binding.rows[0].salesperson_id;
    const conversation = await query<{ id: string }>(
      'SELECT id FROM conversations WHERE salesperson_id = $1 AND conversation_key = $2 AND channel = $3',
      [salespersonId, conversationKey, channel]
    );
    let conversationId = conversation.rows[0]?.id;
    if (!conversationId) {
      const inserted = await query<{ id: string }>(
        'INSERT INTO conversations (salesperson_id, conversation_key, channel) VALUES ($1, $2, $3) RETURNING id',
        [salespersonId, conversationKey, channel]
      );
      conversationId = inserted.rows[0].id;
    }
    return {
      salesperson_id: salespersonId,
      conversation_id: conversationId,
      normalized_text: text.trim()
    };
  }
}
