import axiosMockAdapter from 'axios-mock-adapter';

describe('PandaDocClient', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.PANDADOC_API_KEY = 'key';
    process.env.PANDADOC_TEMPLATE_ID = 'template';
    process.env.TWILIO_ACCOUNT_SID = 'sid';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+123';
    process.env.TWILIO_WEBHOOK_AUTH_TOKEN = 'whsec';
    process.env.ADMIN_API_KEY = 'admin';
  });

  it('retries on server error', async () => {
    jest.resetModules();
    const { PandaDocClient } = await import('../src/services/pandadocClient');
    const client = new PandaDocClient('key');
    const mock = new axiosMockAdapter((client as any).client);

    mock.onPost('/public/v1/documents').replyOnce(500).onPost('/public/v1/documents').replyOnce(200, { id: 'doc1', status: 'draft' });

    const res = await client.createDocument({});
    expect(res.id).toBe('doc1');
  });
});
