import { query } from '../db';

export interface ContextMessage {
  direction: 'INBOUND' | 'OUTBOUND';
  text: string;
  ts: Date;
}

export class ContextStore {
  async saveMessage(conversationId: string, direction: 'INBOUND' | 'OUTBOUND', text: string, ts: Date): Promise<void> {
    await query(
      'INSERT INTO messages (conversation_id, direction, text, ts) VALUES ($1, $2, $3, $4)',
      [conversationId, direction, text, ts]
    );
  }

  async getRecentContext(salespersonId: string, conversationId: string, limit = 50): Promise<ContextMessage[]> {
    const res = await query<ContextMessage>(
      `SELECT m.direction, m.text, m.ts
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.id = $1 AND c.salesperson_id = $2
       ORDER BY m.ts DESC
       LIMIT $3`,
      [conversationId, salespersonId, limit]
    );
    return res.rows.reverse();
  }

  async upsertLeadFacts(leadId: string, facts: Record<string, unknown>): Promise<void> {
    await query(
      `INSERT INTO lead_facts (lead_id, facts_json)
       VALUES ($1, $2)
       ON CONFLICT (lead_id)
       DO UPDATE SET facts_json = $2, updated_at = NOW()` ,
      [leadId, facts]
    );
  }

  async getLeadFacts(leadId: string): Promise<Record<string, unknown> | null> {
    const res = await query<{ facts_json: Record<string, unknown> }>(
      'SELECT facts_json FROM lead_facts WHERE lead_id = $1',
      [leadId]
    );
    return res.rows[0]?.facts_json ?? null;
  }
}
