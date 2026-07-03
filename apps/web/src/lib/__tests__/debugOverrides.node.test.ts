// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getAiHandOverride } from '@/lib/debugOverrides';

describe('getAiHandOverride without a window', () => {
  it('returns null when neither a query nor a window is available', () => {
    expect(typeof window).toBe('undefined');
    expect(getAiHandOverride()).toBeNull();
  });
});
