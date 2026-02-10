import { OpenClawEvent, OpenClawResponse } from './types';
import { handleOpenClawEvent } from '../services/skillHandler';

export const OpenClawSkill = {
  name: 'otbay_pandadoc_proposals',
  actions: ['create_proposal', 'proposal_status', 'resend_proposal', 'update_proposal'],
  handler: async (event: OpenClawEvent): Promise<OpenClawResponse> => {
    return handleOpenClawEvent(event);
  }
};
