import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';

export interface PandaDocCreateResponse {
  id: string;
  status: string;
}

export class PandaDocClient {
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: config.pandadoc.baseUrl,
      headers: {
        Authorization: `API-Key ${apiKey ?? config.pandadoc.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listTemplates() {
    return this.requestWithRetry(() => this.client.get('/public/v1/templates'));
  }

  async createDocument(payload: Record<string, unknown>): Promise<PandaDocCreateResponse> {
    const response = await this.requestWithRetry(() => this.client.post('/public/v1/documents', payload));
    return response.data;
  }

  async sendDocument(documentId: string): Promise<void> {
    await this.requestWithRetry(() => this.client.post(`/public/v1/documents/${documentId}/send`));
  }

  async getDocumentStatus(documentId: string): Promise<{ status: string }> {
    const response = await this.requestWithRetry(() => this.client.get(`/public/v1/documents/${documentId}`));
    return { status: response.data.status };
  }

  async createShareLink(documentId: string): Promise<{ link: string | null }> {
    const response = await this.requestWithRetry(() =>
      this.client.post(`/public/v1/documents/${documentId}/session`)
    );
    return { link: response.data?.url ?? null };
  }

  private async requestWithRetry<T>(fn: () => Promise<T>, attempts = 3, delay = 200): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.response?.status;
      if (attempts <= 1 || (status && status >= 400 && status < 500)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.requestWithRetry(fn, attempts - 1, delay * 2);
    }
  }
}
