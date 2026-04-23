import {BedrockRuntimeClient, ConverseCommand, type ConverseCommandOutput,} from '@aws-sdk/client-bedrock-runtime';

export type GenAiTask = 'coach' | 'summary';

export interface GenAiLineInput {
  prompt: string;
  system: string;
  task: GenAiTask;
}

export interface GenAiProvider {
  generateLine(input: GenAiLineInput): Promise<string>;
}

export interface GenAiProviderConfig {
  bedrockModelId?: string;
  bedrockRegion?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  provider: 'bedrock' | 'ollama' | 'disabled';
  timeoutMs: number;
}

const parseProvider = (value: string | undefined): GenAiProviderConfig['provider'] => {
  if (value === 'bedrock' || value === 'ollama' || value === 'disabled') {
    return value;
  }

  return process.env.NODE_ENV === 'production' ? 'bedrock' : 'ollama';
};

const parseTimeout = (value: string | undefined): number => {
  const parsedValue = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 4500;
};

export const getGenAiProviderConfig = (): GenAiProviderConfig => ({
  bedrockModelId: process.env.BEDROCK_MODEL_ID,
  bedrockRegion: process.env.BEDROCK_REGION ?? process.env.AWS_REGION,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL,
  provider: parseProvider(process.env.GENAI_PROVIDER),
  timeoutMs: parseTimeout(process.env.GENAI_TIMEOUT_MS),
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Gen AI request timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'AbortError' || error.message === 'This operation was aborted');

const extractBedrockText = (response: ConverseCommandOutput): string => {
  const content = response.output?.message?.content ?? [];
  const textBlock = content.find((block) => typeof block.text === 'string');

  return textBlock?.text?.trim() ?? '';
};

class BedrockGenAiProvider implements GenAiProvider {
  private readonly client: BedrockRuntimeClient;

  constructor(
    private readonly config: GenAiProviderConfig,
  ) {
    this.client = new BedrockRuntimeClient({
      region: config.bedrockRegion,
    });
  }

  async generateLine(input: GenAiLineInput): Promise<string> {
    if (!this.config.bedrockModelId) {
      throw new Error('BEDROCK_MODEL_ID is required when GENAI_PROVIDER=bedrock');
    }

    const response = await withTimeout(
      this.client.send(new ConverseCommand({
        inferenceConfig: {
          maxTokens: 80,
          temperature: 0.2,
        },
        messages: [{
          content: [{text: input.prompt}],
          role: 'user',
        }],
        modelId: this.config.bedrockModelId,
        system: [{text: input.system}],
      })),
      this.config.timeoutMs,
    );

    return extractBedrockText(response);
  }
}

class OllamaGenAiProvider implements GenAiProvider {
  constructor(
    private readonly config: GenAiProviderConfig,
  ) {}

  async generateLine(input: GenAiLineInput): Promise<string> {
    if (!this.config.ollamaModel) {
      throw new Error('OLLAMA_MODEL is required when GENAI_PROVIDER=ollama');
    }

    const baseUrl = this.config.ollamaBaseUrl?.replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        body: JSON.stringify({
          model: this.config.ollamaModel,
          prompt: `${input.system}\n\n${input.prompt}`,
          stream: false,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with ${response.status}`);
      }

      const payload = await response.json() as {response?: string};

      return payload.response?.trim() ?? '';
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          `Ollama request timed out after ${this.config.timeoutMs}ms for model ${this.config.ollamaModel} at ${baseUrl}. Set GENAI_TIMEOUT_MS higher or use a faster local model.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const createGenAiProvider = (
  config: GenAiProviderConfig = getGenAiProviderConfig(),
): GenAiProvider | null => {
  if (config.provider === 'disabled') {
    return null;
  }

  if (config.provider === 'ollama') {
    return new OllamaGenAiProvider(config);
  }

  return new BedrockGenAiProvider(config);
};

let _sharedProvider: GenAiProvider | null | undefined;

export const getSharedGenAiProvider = (): GenAiProvider | null => {
  if (_sharedProvider === undefined) {
    _sharedProvider = createGenAiProvider();
  }

  return _sharedProvider;
};
