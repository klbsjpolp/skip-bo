import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyThemeValue } from '../themeMigration';

describe('migrateLegacyThemeValue', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("rewrites a stored 'theme-bonbon' value to 'theme-candy'", () => {
    window.localStorage.setItem('theme', 'theme-bonbon');
    migrateLegacyThemeValue();
    expect(window.localStorage.getItem('theme')).toBe('theme-candy');
  });

  it('leaves a non-legacy theme value untouched', () => {
    window.localStorage.setItem('theme', 'theme-midnight');
    migrateLegacyThemeValue();
    expect(window.localStorage.getItem('theme')).toBe('theme-midnight');
  });

  it('does nothing when no theme is stored', () => {
    migrateLegacyThemeValue();
    expect(window.localStorage.getItem('theme')).toBeNull();
  });
});
