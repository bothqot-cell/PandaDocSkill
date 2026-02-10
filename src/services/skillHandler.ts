import { ChannelRouter } from './channelRouter';
import { ContextStore } from './contextStore';
import { IntentEngine } from './intentEngine';
import { ProposalAssembler, generatePaymentSchedule } from './proposalAssembler';
import { PandaDocClient } from './pandadocClient';
import { mapProposalToTokens } from './templateMapper';
import { query } from '../db';
import { OpenClawEvent, OpenClawResponse } from '../openclaw/types';
import { ProposalSpec } from './proposalSchema';
import { logger } from '../utils/logger';

const router = new ChannelRouter();
const contextStore = new ContextStore();
const intentEngine = new IntentEngine();
const assembler = new ProposalAssembler();

const getSalesperson = async (salespersonId: string) => {
  const res = await query<{ name: string; phone: string | null; email: string | null; panda_api_key: string | null }>(
    'SELECT name, phone, email, panda_api_key FROM salespeople WHERE id = $1',
    [salespersonId]
  );
  return res.rows[0];
};

const getLatestLeadId = async (salespersonId: string) => {
  const res = await query<{ id: string }>(
    'SELECT id FROM leads WHERE salesperson_id = $1 ORDER BY created_at DESC LIMIT 1',
    [salespersonId]
  );
  return res.rows[0]?.id;
};

const getLatestProposal = async (salespersonId: string) => {
  const res = await query<{ id: string; pandadoc_document_id: string }>(
    'SELECT id, pandadoc_document_id FROM proposals WHERE salesperson_id = $1 ORDER BY created_at DESC LIMIT 1',
    [salespersonId]
  );
  return res.rows[0];
};

const buildPandaDocPayload = (proposal: ProposalSpec, tokens: Record<string, string>) => {
  const recipients = proposal.pandadoc.recipients.map((recipient) => ({
    email: recipient.email,
    first_name: recipient.name,
    role: recipient.role
  }));
  return {
    name: proposal.proposal.title,
    template_uuid: proposal.pandadoc.template_id,
    recipients,
    tokens: {
      ...tokens,
      ...proposal.pandadoc.tokens
    }
  };
};

export const handleOpenClawEvent = async (event: OpenClawEvent): Promise<OpenClawResponse> => {
  try {
    const routed = await router.route(event.channel, event.sender_id, event.conversation_key, event.text);
    const salesperson = await getSalesperson(routed.salesperson_id);
    if (!salesperson) {
      return { reply_text: 'Salesperson not found for this channel.' };
    }
    await contextStore.saveMessage(routed.conversation_id, 'INBOUND', event.text, new Date(event.ts));
    const context = await contextStore.getRecentContext(routed.salesperson_id, routed.conversation_id, 50);
    const intent = intentEngine.parse(event.text);

    if (intent.type === 'NO_ACTION') {
      return { reply_text: 'No proposal action detected.' };
    }

    const leadId = (intent.parameters?.lead_id as string) ?? (await getLatestLeadId(routed.salesperson_id));
    const leadFacts = leadId ? await contextStore.getLeadFacts(leadId) : null;
    const contextText = context.map((item) => `${item.direction}: ${item.text}`).join('\n');

    if (intent.type === 'STATUS') {
      const latest = await getLatestProposal(routed.salesperson_id);
      if (!latest) {
        return { reply_text: 'No proposals found.' };
      }
      const pandaClient = new PandaDocClient(salesperson.panda_api_key ?? undefined);
      const status = await pandaClient.getDocumentStatus(latest.pandadoc_document_id);
      return { reply_text: `Latest proposal ${latest.pandadoc_document_id} status: ${status.status}` };
    }

    if (intent.type === 'RESEND') {
      const latest = await getLatestProposal(routed.salesperson_id);
      if (!latest) {
        return { reply_text: 'No proposals found to resend.' };
      }
      const pandaClient = new PandaDocClient(salesperson.panda_api_key ?? undefined);
      await pandaClient.sendDocument(latest.pandadoc_document_id);
      return { reply_text: `Resent proposal ${latest.pandadoc_document_id}.` };
    }

    const proposal = await assembler.assemble({
      message: event.text,
      context: contextText,
      leadFacts,
      salesperson: {
        name: salesperson.name,
        phone: salesperson.phone,
        email: salesperson.email
      }
    });

    if (proposal.proposal.total_price_cents < 100000) {
      proposal.proposal.payment_schedule = generatePaymentSchedule(proposal.proposal.total_price_cents);
      proposal.proposal.needs_review.push('total_price_below_cslb_threshold');
      proposal.pandadoc.send = false;
    }

    const tokens = await mapProposalToTokens(proposal);
    const pandaClient = new PandaDocClient(salesperson.panda_api_key ?? undefined);
    const payload = buildPandaDocPayload(proposal, tokens);
    const created = await pandaClient.createDocument(payload);

    if (proposal.pandadoc.send) {
      await pandaClient.sendDocument(created.id);
    }
    const share = await pandaClient.createShareLink(created.id).catch(() => ({ link: null }));

    await query(
      `INSERT INTO proposals (salesperson_id, lead_id, pandadoc_document_id, status, total_price_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [routed.salesperson_id, leadId, created.id, created.status, proposal.proposal.total_price_cents, proposal.proposal.currency]
    );

    await query(
      `INSERT INTO audit_log (salesperson_id, action, entity_type, entity_id, channel, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [routed.salesperson_id, 'CREATE_PROPOSAL', 'proposal', created.id, event.channel, { needs_review: proposal.proposal.needs_review }]
    );

    await contextStore.saveMessage(
      routed.conversation_id,
      'OUTBOUND',
      `Proposal created: ${created.id}`,
      new Date()
    );

    return {
      reply_text: `Proposal ${created.id} created. ${share.link ? `Link: ${share.link}` : ''} Status: ${created.status}.`
    };
  } catch (error: any) {
    if (error.message === 'UNBOUND_SENDER') {
      return { reply_text: 'Sender not bound. Contact admin to bind this channel.' };
    }
    logger.error({ err: error }, 'Failed to handle OpenClaw event');
    return { reply_text: 'Failed to process request.' };
  }
};
