export type Channel = 'TELEGRAM' | 'WHATSAPP';

export interface OpenClawEvent {
  channel: Channel;
  conversation_key: string;
  sender_id: string;
  text: string;
  ts: number;
  metadata?: Record<string, unknown>;
}

export interface OpenClawResponse {
  reply_text: string;
  side_effects?: Record<string, unknown>;
}
