export type ActionType = 'CREATE_PROPOSAL' | 'STATUS' | 'RESEND' | 'UPDATE_AND_RESEND' | 'NO_ACTION';

export interface ActionPlan {
  type: ActionType;
  target?: string;
  parameters?: Record<string, unknown>;
}

const priceRegex = /(\$?)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)(k|K)?/;

export class IntentEngine {
  parse(message: string): ActionPlan {
    const text = message.toLowerCase();
    if (text.includes('proposal status') || text.includes('status')) {
      return { type: 'STATUS' };
    }
    if (text.includes('resend')) {
      return { type: 'RESEND' };
    }
    if (text.includes('change total') || text.includes('update')) {
      const price = this.extractPrice(text);
      return { type: 'UPDATE_AND_RESEND', parameters: { total_price_cents: price } };
    }
    if (text.includes('create proposal') || text.startsWith('proposal') || text.includes('create estimate')) {
      const price = this.extractPrice(text);
      return { type: 'CREATE_PROPOSAL', parameters: { total_price_cents: price } };
    }
    return { type: 'NO_ACTION' };
  }

  private extractPrice(text: string): number | null {
    const match = text.match(priceRegex);
    if (!match) {
      return null;
    }
    const raw = match[2].replace(/,/g, '');
    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
      return null;
    }
    const multiplier = match[3] ? 1000 : 1;
    return Math.round(numeric * multiplier * 100);
  }
}
