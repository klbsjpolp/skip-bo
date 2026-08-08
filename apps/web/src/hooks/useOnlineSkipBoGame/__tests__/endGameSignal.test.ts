import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEndGameSignal, END_GAME_STATS_GRACE_MS } from '@/hooks/useOnlineSkipBoGame/endGameSignal';

describe('createEndGameSignal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (graceMs?: number) => {
    const send = vi.fn();
    return { send, signal: createEndGameSignal({ send, graceMs }) };
  };

  it('does not send on arm — the stats record still has to go out first', () => {
    const { send, signal } = setup();

    signal.arm(2);

    expect(send).not.toHaveBeenCalled();
    expect(signal.isArmed()).toBe(true);
    expect(signal.isSent()).toBe(false);
  });

  it('sends the armed winner on flush and cancels the fallback timer', () => {
    const { send, signal } = setup();

    signal.arm(2);
    signal.flush();

    expect(send).toHaveBeenCalledExactlyOnceWith(2);
    expect(signal.isArmed()).toBe(false);
    expect(signal.isSent()).toBe(true);

    // The timer must not fire a second endGame after an early flush.
    vi.advanceTimersByTime(END_GAME_STATS_GRACE_MS * 2);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends anyway when the record never arrives within the grace delay', () => {
    const { send, signal } = setup();

    signal.arm(null);
    vi.advanceTimersByTime(END_GAME_STATS_GRACE_MS - 1);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledExactlyOnceWith(null);
    expect(signal.isSent()).toBe(true);
  });

  it('ignores a flush triggered by a record arriving after the timer fired', () => {
    const { send, signal } = setup();

    signal.arm(1);
    vi.advanceTimersByTime(END_GAME_STATS_GRACE_MS);
    expect(send).toHaveBeenCalledTimes(1);

    signal.flush();

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('refuses to re-arm once sent, so a finished game signals exactly once', () => {
    const { send, signal } = setup();

    signal.arm(0);
    signal.flush();

    // pushAuthority keeps running while the room sits finished.
    signal.arm(0);
    signal.arm(0);
    vi.advanceTimersByTime(END_GAME_STATS_GRACE_MS * 2);

    expect(send).toHaveBeenCalledTimes(1);
    expect(signal.isArmed()).toBe(false);
  });

  it('keeps the first winner when arm is called repeatedly before a flush', () => {
    const { send, signal } = setup();

    signal.arm(3);
    signal.arm(1);
    signal.flush();

    expect(send).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('is a no-op to flush when nothing was ever armed', () => {
    const { send, signal } = setup();

    signal.flush();

    expect(send).not.toHaveBeenCalled();
    expect(signal.isSent()).toBe(false);
  });

  it('dispose cancels the fallback without sending', () => {
    const { send, signal } = setup();

    signal.arm(2);
    signal.dispose();
    vi.advanceTimersByTime(END_GAME_STATS_GRACE_MS * 2);

    expect(send).not.toHaveBeenCalled();
  });

  it('honours a custom grace delay', () => {
    const { send, signal } = setup(50);

    signal.arm(0);
    vi.advanceTimersByTime(49);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
