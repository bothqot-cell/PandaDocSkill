import axios from 'axios';
import { config } from '../config/config';

export interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export const callLlm = async (messages: LlmMessage[]): Promise<string> => {
  if (!config.llm.apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }
  const response = await axios.post(
    `${config.llm.baseUrl}/chat/completions`,
    {
      model: config.llm.model,
      messages,
      temperature: 0.2
    },
    {
      headers: {
        Authorization: `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content as string;
};
