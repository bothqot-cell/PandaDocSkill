import crypto from 'crypto';

export const verifyTwilioSignature = (
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean => {
  if (!signature) {
    return false;
  }
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const digest = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};
