import { ProposalSpecSchema } from '../src/services/proposalSchema';

describe('ProposalSpecSchema', () => {
  it('rejects invalid data', () => {
    const result = ProposalSpecSchema.safeParse({ version: '1.0' });
    expect(result.success).toBe(false);
  });
});
