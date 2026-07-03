import { describe, expect, it } from 'vitest';

import { getAiHandOverride } from '@/lib/debugOverrides';

describe('getAiHandOverride', () => {
  it('reads window.location.search when no query is given', () => {
    expect(getAiHandOverride()).toBeNull();
  });

  it('parses JSON arrays with string members', () => {
    expect(getAiHandOverride('?aiHand=' + encodeURIComponent('["1","2"]'))).toEqual([
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
    ]);
  });

  it('parses a JSON array', () => {
    expect(getAiHandOverride('?aiHand=[1,2,3]')).toEqual([
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
      { value: 3, isSkipBo: false },
    ]);
  });

  it('parses comma- and dash-separated values', () => {
    expect(getAiHandOverride('?aiHand=4,5')).toEqual([
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
    ]);
    expect(getAiHandOverride('?aiHand=6-7')).toEqual([
      { value: 6, isSkipBo: false },
      { value: 7, isSkipBo: false },
    ]);
  });

  it('returns null without the param or with garbage', () => {
    expect(getAiHandOverride('')).toBeNull();
    expect(getAiHandOverride('?fixture=ready-human')).toBeNull();
    expect(getAiHandOverride('?aiHand=abc')).toBeNull();
    expect(getAiHandOverride('?aiHand=0')).toBeNull();
  });
});
