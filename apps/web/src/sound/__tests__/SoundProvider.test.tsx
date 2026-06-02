import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { SoundProvider } from '@/sound/SoundProvider';
import { useSound } from '@/sound/useSound';
import { soundController } from '@/sound/controller';
import { SoundToggle } from '@/components/SoundToggle';
import { getStoredSoundEnabled } from '@/state/lobbyPreferences';

// next-themes reads matchMedia on mount; jsdom doesn't provide it.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

const setEnabledSpy = vi.spyOn(soundController, 'setEnabled');
const setVolumeSpy = vi.spyOn(soundController, 'setVolume');
const setThemeIdSpy = vi.spyOn(soundController, 'setThemeId');
const unlockSpy = vi.spyOn(soundController, 'unlock');

const renderWithProviders = (ui: React.ReactNode, theme = 'theme-retro') =>
  render(
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
      <SoundProvider>{ui}</SoundProvider>
    </ThemeProvider>,
  );

const Probe = () => {
  const { enabled, volume, setEnabled, setVolume } = useSound();
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="volume">{volume}</span>
      <button onClick={() => setEnabled(true)}>on</button>
      <button onClick={() => setVolume(0.3)}>vol</button>
    </div>
  );
};

describe('SoundProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    setEnabledSpy.mockClear();
    setVolumeSpy.mockClear();
    setThemeIdSpy.mockClear();
    unlockSpy.mockClear();
  });

  afterEach(() => {
    soundController.setEnabled(false);
  });

  it('pushes initial prefs (disabled by default) into the controller', () => {
    renderWithProviders(<Probe />);
    expect(screen.getByTestId('enabled').textContent).toBe('false');
    expect(setEnabledSpy).toHaveBeenCalledWith(false);
    expect(setVolumeSpy).toHaveBeenCalled();
  });

  it('syncs the active visual theme to the controller', () => {
    renderWithProviders(<Probe />, 'theme-retro');
    expect(setThemeIdSpy).toHaveBeenCalledWith('theme-retro');
  });

  it('enabling persists and forwards to the controller', () => {
    renderWithProviders(<Probe />);
    act(() => {
      screen.getByText('on').click();
    });
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(getStoredSoundEnabled()).toBe(true);
    expect(setEnabledSpy).toHaveBeenLastCalledWith(true);
  });

  it('setting volume persists, clamps, and forwards', () => {
    renderWithProviders(<Probe />);
    act(() => {
      screen.getByText('vol').click();
    });
    expect(screen.getByTestId('volume').textContent).toBe('0.3');
    expect(setVolumeSpy).toHaveBeenLastCalledWith(0.3);
  });

  it('unlocks the AudioContext on first user gesture', () => {
    renderWithProviders(<Probe />);
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(unlockSpy).toHaveBeenCalled();
  });

  it('throws if useSound is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/SoundProvider/);
    spy.mockRestore();
  });
});

describe('SoundToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    setEnabledSpy.mockClear();
  });

  it('renders muted by default and toggles on click', () => {
    renderWithProviders(<SoundToggle />);
    const toggle = screen.getByTestId('sound-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    act(() => {
      fireEvent.click(toggle);
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(setEnabledSpy).toHaveBeenLastCalledWith(true);
  });
});
