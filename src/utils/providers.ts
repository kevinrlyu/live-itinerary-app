export interface ModelProvider {
  id: string;
  name: string;
  baseURL: string;
  /** Whether this provider uses the Anthropic API format (vs OpenAI-compatible) */
  isAnthropic?: boolean;
  /** Placeholder text for the API key field */
  apiKeyPlaceholder?: string;
}

const PROVIDERS: ModelProvider[] = [
  {
    id: 'alibaba',
    name: 'Alibaba (Qwen)',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseURL: 'https://api.anthropic.com',
    isAnthropic: true,
    apiKeyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'deepseek',
    name: 'Deepseek',
    baseURL: 'https://api.deepseek.com',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyPlaceholder: 'AIza...',
  },
  {
    id: 'minimax',
    name: 'Minimax',
    baseURL: 'https://api.minimax.chat/v1',
    apiKeyPlaceholder: 'eyJ...',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    baseURL: 'https://api.openai.com/v1',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'zhipu',
    name: 'Zhipu (GLM)',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyPlaceholder: 'API key',
  },
];

export function getProviders(): ModelProvider[] {
  return PROVIDERS;
}

export function getProvider(id: string): ModelProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
