import {afterEach, describe, expect, it, vi} from 'vitest';

import {createGenAiProvider} from '../src/services/genAiProvider.js';

describe('Gen AI provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports Ollama aborts as timeout diagnostics', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string | URL | Request, init?: RequestInit) => (
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('This operation was aborted', 'AbortError'));
        });
      })
    )));

    const provider = createGenAiProvider({
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      ollamaModel: 'gemma4:e2b',
      provider: 'ollama',
      timeoutMs: 5,
    });

    if (!provider) {
      throw new Error('Expected provider');
    }

    const generatedLine = provider.generateLine({
      prompt: 'prompt',
      system: 'system',
      task: 'coach',
    });
    const expectation = expect(generatedLine).rejects.toThrow(
      'Ollama request timed out after 5ms for model gemma4:e2b at http://127.0.0.1:11434.',
    );

    await vi.advanceTimersByTimeAsync(5);
    await expectation;
  });
});
