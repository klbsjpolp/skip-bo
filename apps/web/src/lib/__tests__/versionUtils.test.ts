import {describe, expect, it} from 'vitest';

import {compareAppVersions, normalizeVersionTag} from '../versionUtils';

describe('versionUtils', () => {
  it('normalizes blank version tags to null', () => {
    expect(normalizeVersionTag('  ')).toBeNull();
    expect(normalizeVersionTag(' v1.2.3 ')).toBe('v1.2.3');
  });

  it('compares semantic versions with numeric ordering', () => {
    expect(compareAppVersions('v1.2.3', 'v1.2.4')).toBeLessThan(0);
    expect(compareAppVersions('v2.0.0', 'v1.9.9')).toBeGreaterThan(0);
  });

  it('treats release versions as newer than prereleases', () => {
    expect(compareAppVersions('v1.2.3-beta.1', 'v1.2.3')).toBeLessThan(0);
    expect(compareAppVersions('v1.2.3', 'v1.2.3-beta.1')).toBeGreaterThan(0);
  });

  it('falls back to lexical ordering for non-semver strings', () => {
    expect(compareAppVersions('release-a', 'release-b')).toBeLessThan(0);
  });
});
