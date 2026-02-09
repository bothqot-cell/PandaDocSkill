import { verifyTwilioSignature } from '../src/utils/twilio';
import crypto from 'crypto';

describe('verifyTwilioSignature', () => {
  it('validates signature', () => {
    const authToken = 'secret';
    const url = 'https://example.com/webhook';
    const params = { From: 'whatsapp:+1555', Body: 'Hello' };

    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const signature = crypto.createHmac('sha1', authToken).update(data).digest('base64');

    expect(verifyTwilioSignature(authToken, signature, url, params)).toBe(true);
  });
});
