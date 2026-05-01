import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { fetch as expoFetch } from 'expo/fetch';
import { getProvider } from './providers';

export interface LLMConfig {
  providerId: string;
  apiKey: string;
  model: string;
}

interface LLMCallOptions {
  config: LLMConfig;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

/** Call an LLM and return the text response. */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const { config, systemPrompt, userMessage, maxTokens } = options;
  const provider = getProvider(config.providerId);
  if (!provider) throw new Error(`Unknown provider: ${config.providerId}`);

  if (provider.isAnthropic) {
    return callAnthropic(config, systemPrompt, userMessage, maxTokens);
  } else {
    return callOpenAICompatible(config, provider.baseURL, systemPrompt, userMessage, maxTokens);
  }
}

async function callAnthropic(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
  });

  const message = await client.messages.create({
    model: config.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response from AI');
  return content.text;
}

async function callOpenAICompatible(
  config: LLMConfig,
  baseURL: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from AI');
  return text;
}

/** Fetch available models from a provider. Returns model IDs sorted alphabetically. */
export async function fetchModels(providerId: string, apiKey: string): Promise<string[]> {
  const provider = getProvider(providerId);
  if (!provider) return [];

  try {
    if (provider.isAnthropic) {
      const client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
      });
      const page = await client.models.list({ limit: 100 });
      return page.data.map((m) => m.id).sort();
    }

    const client = new OpenAI({
      apiKey,
      baseURL: provider.baseURL,
      dangerouslyAllowBrowser: true,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
    });

    const list = await client.models.list();
    const models: string[] = [];
    for await (const model of list) {
      models.push(model.id);
    }
    return models.sort();
  } catch {
    return [];
  }
}
