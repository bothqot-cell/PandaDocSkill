import { ProposalSpec, ProposalSpecSchema } from './proposalSchema';
import { callLlm } from '../llm/openaiClient';
import { config } from '../config/config';

export interface ProposalAssemblerInput {
  message: string;
  context: string;
  leadFacts: Record<string, unknown> | null;
  salesperson: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  templateId?: string;
}

const systemPrompt = `You are an assistant generating OT Bay Builders PandaDoc proposal JSON.
Return JSON only with no commentary.
Follow this schema strictly:
{
  "version": "1.0",
  "lead": {
    "client_name": "string",
    "client_email": "string|null",
    "address": "string|null",
    "project_type": "string",
    "city": "string|null"
  },
  "proposal": {
    "title": "string",
    "total_price_cents": number,
    "currency": "USD",
    "start_date": "string|null",
    "notes": "string|null",
    "client_supplies": ["string"],
    "scope_of_work": "string",
    "exclusions": "string",
    "payment_schedule": [
      {"step": number, "title": "string", "amount_cents": number, "due_trigger": "string"}
    ],
    "needs_review": ["string"]
  },
  "pandadoc": {
    "template_id": "string",
    "tokens": {"key": "value"},
    "recipients": [
      {"role": "Client"|"Salesperson"|"Admin", "name": "string", "email": "string"}
    ],
    "send": boolean
  }
}
Rules:
- Output JSON only.
- OT Bay Builders style: milestone-based schedule, CSLB rule: first payment max $1,000.
- Include clear scope sections, exclusions list.
- If facts missing, fill placeholders and list missing fields in needs_review.
- If total < 1000 set first payment to total, set send=false, add needs_review.
- Prefer 3-5 milestones after step 1.
Examples:
Bathroom remodel: scope includes demo, plumbing, tile, fixtures; exclusions include permits/abatement.
Patio enclosure: scope includes framing, glazing, roof tie-in; exclusions include electrical upgrades.
Roofing: scope includes tear-off, underlayment, shingle install; exclusions include structural repairs.
`;

const buildFallbackProposal = (input: ProposalAssemblerInput): ProposalSpec => {
  const total = 2500000;
  const paymentSchedule = generatePaymentSchedule(total);
  return {
    version: '1.0',
    lead: {
      client_name: 'Client Name',
      client_email: null,
      address: null,
      project_type: 'General Remodel',
      city: null
    },
    proposal: {
      title: 'OT Bay Builders Proposal',
      total_price_cents: total,
      currency: 'USD',
      start_date: null,
      notes: 'Generated from chat context; verify before sending.',
      client_supplies: [],
      scope_of_work: 'Scope of work to be confirmed. Includes standard labor and materials for agreed project type.',
      exclusions: 'Excludes permits, engineering, and unforeseen structural repairs unless noted.',
      payment_schedule: paymentSchedule,
      needs_review: ['client_name', 'client_email', 'address', 'project_type']
    },
    pandadoc: {
      template_id: input.templateId ?? config.pandadoc.defaultTemplateId,
      tokens: {},
      recipients: [
        { role: 'Salesperson', name: input.salesperson.name, email: input.salesperson.email ?? 'sales@otbay.local' }
      ],
      send: false
    }
  };
};

export const generatePaymentSchedule = (total: number): ProposalSpec['proposal']['payment_schedule'] => {
  if (total <= 0) {
    return [{ step: 1, title: 'Deposit', amount_cents: 0, due_trigger: 'Signing' }];
  }
  const schedule: ProposalSpec['proposal']['payment_schedule'] = [];
  const firstPayment = Math.min(total, 100000);
  schedule.push({ step: 1, title: 'Deposit', amount_cents: firstPayment, due_trigger: 'Signing' });
  const remaining = total - firstPayment;
  if (remaining <= 0) {
    return schedule;
  }
  const milestones = [
    { title: 'Mobilization & Demo', due_trigger: 'Site protection and demo complete' },
    { title: 'Rough Trades', due_trigger: 'Rough trades complete' },
    { title: 'Surface Prep', due_trigger: 'Waterproofing/drywall complete' },
    { title: 'Finishes', due_trigger: 'Finishes and punch list complete' }
  ];
  const perStep = Math.floor(remaining / milestones.length);
  let allocated = 0;
  milestones.forEach((milestone, index) => {
    const amount = index === milestones.length - 1 ? remaining - allocated : perStep;
    allocated += amount;
    schedule.push({
      step: index + 2,
      title: milestone.title,
      amount_cents: amount,
      due_trigger: milestone.due_trigger
    });
  });
  return schedule;
};

export class ProposalAssembler {
  async assemble(input: ProposalAssemblerInput): Promise<ProposalSpec> {
    try {
      const response = await callLlm([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            message: input.message,
            context: input.context,
            leadFacts: input.leadFacts,
            salesperson: input.salesperson,
            template_id: input.templateId ?? config.pandadoc.defaultTemplateId
          })
        }
      ]);
      const parsed = JSON.parse(response);
      const result = ProposalSpecSchema.safeParse(parsed);
      if (!result.success) {
        return buildFallbackProposal(input);
      }
      return result.data;
    } catch (error) {
      return buildFallbackProposal(input);
    }
  }
}
