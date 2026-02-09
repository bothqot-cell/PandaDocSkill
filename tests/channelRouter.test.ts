import { ChannelRouter } from '../src/services/channelRouter';
import { query } from '../src/db';

jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const mockedQuery = query as jest.Mock;

describe('ChannelRouter', () => {
  it('routes to correct salesperson', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ salesperson_id: 'sp-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'conv-1' }] });

    const router = new ChannelRouter();
    const result = await router.route('WHATSAPP', '+15551234567', 'msg-1', 'hello');

    expect(result.salesperson_id).toBe('sp-1');
    expect(result.conversation_id).toBe('conv-1');
    expect(result.normalized_text).toBe('hello');
  });
});
