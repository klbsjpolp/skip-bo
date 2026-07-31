import { describe, expect, it } from 'vitest';

import { createViewEchoTracker } from '@/hooks/useOnlineSkipBoGame/viewEchoes';

describe('createViewEchoTracker', () => {
  it('renders views that arrive with no outstanding echoes (host pushes, resyncs)', () => {
    const tracker = createViewEchoTracker();

    expect(tracker.shouldRender()).toBe(true);
    expect(tracker.shouldRender()).toBe(true);
    expect(tracker.pending()).toBe(0);
  });

  it('renders the echo of a single outstanding move', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();

    expect(tracker.shouldRender()).toBe(true);
    expect(tracker.pending()).toBe(0);
  });

  it('drops the stale echo when two moves are in flight (drag: SELECT then PLAY)', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();
    tracker.expectEcho();

    // Echo for SELECT_CARD — predates the optimistic play, must not render.
    expect(tracker.shouldRender()).toBe(false);
    // Echo for PLAY_CARD — the current state, render it.
    expect(tracker.shouldRender()).toBe(true);
    expect(tracker.pending()).toBe(0);
  });

  it('renders only the last echo when three moves are in flight', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();
    tracker.expectEcho();
    tracker.expectEcho();

    expect([tracker.shouldRender(), tracker.shouldRender(), tracker.shouldRender()]).toEqual([false, false, true]);
  });

  it('renders the next view after a reset, even with echoes outstanding', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();
    tracker.expectEcho();

    // Reconnect / actionRejected: the owed echoes will never arrive.
    tracker.reset();

    expect(tracker.pending()).toBe(0);
    expect(tracker.shouldRender()).toBe(true);
  });

  it('keeps counting correctly after a reset', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();
    tracker.reset();

    tracker.expectEcho();
    tracker.expectEcho();

    expect([tracker.shouldRender(), tracker.shouldRender()]).toEqual([false, true]);
  });

  it('does not go negative when more views arrive than moves were sent', () => {
    const tracker = createViewEchoTracker();
    tracker.expectEcho();

    tracker.shouldRender();
    tracker.shouldRender();
    tracker.shouldRender();

    expect(tracker.pending()).toBe(0);
    expect(tracker.shouldRender()).toBe(true);
  });
});
