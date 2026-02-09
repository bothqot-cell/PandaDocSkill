import { ProposalSpec } from './proposalSchema';
import { query } from '../db';

const formatPaymentSchedule = (schedule: ProposalSpec['proposal']['payment_schedule']): string => {
  return schedule
    .map((step) => `${step.step}. ${step.title} - $${(step.amount_cents / 100).toFixed(2)} (Due: ${step.due_trigger})`)
    .join('\n');
};

export const mapProposalToTokens = async (proposal: ProposalSpec): Promise<Record<string, string>> => {
  const mappingRes = await query<{ mapping_json: Record<string, string> }>(
    'SELECT mapping_json FROM template_mappings WHERE template_id = $1',
    [proposal.pandadoc.template_id]
  );
  const mapping = mappingRes.rows[0]?.mapping_json ?? {
    ClientName: 'lead.client_name',
    ClientEmail: 'lead.client_email',
    ProjectAddress: 'lead.address',
    ProjectType: 'lead.project_type',
    TotalPrice: 'proposal.total_price_cents',
    ScopeOfWork: 'proposal.scope_of_work',
    Exclusions: 'proposal.exclusions',
    PaymentSchedule: 'proposal.payment_schedule',
    SalespersonName: 'pandadoc.recipients[1].name',
    SalespersonPhone: 'pandadoc.tokens.SalespersonPhone',
    SalespersonEmail: 'pandadoc.recipients[1].email'
  };

  const tokens: Record<string, string> = {};
  Object.entries(mapping).forEach(([token, path]) => {
    if (path === 'lead.client_name') tokens[token] = proposal.lead.client_name;
    if (path === 'lead.client_email') tokens[token] = proposal.lead.client_email ?? '';
    if (path === 'lead.address') tokens[token] = proposal.lead.address ?? '';
    if (path === 'lead.project_type') tokens[token] = proposal.lead.project_type;
    if (path === 'proposal.total_price_cents') tokens[token] = `$${(proposal.proposal.total_price_cents / 100).toFixed(2)}`;
    if (path === 'proposal.scope_of_work') tokens[token] = proposal.proposal.scope_of_work;
    if (path === 'proposal.exclusions') tokens[token] = proposal.proposal.exclusions;
    if (path === 'proposal.payment_schedule') tokens[token] = formatPaymentSchedule(proposal.proposal.payment_schedule);
  });
  return tokens;
};
