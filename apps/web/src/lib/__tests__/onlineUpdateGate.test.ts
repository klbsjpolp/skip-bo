import { describe, expect, it, vi } from 'vitest';

import { applyPendingUpdateBeforeOnlineStart } from '@/lib/onlineUpdateGate';

describe('applyPendingUpdateBeforeOnlineStart', () => {
  it('does not touch the reload path when no update is pending', async () => {
    const reloadToUpdate = vi.fn().mockResolvedValue(true);

    await expect(applyPendingUpdateBeforeOnlineStart(false, reloadToUpdate)).resolves.toBe(false);

    expect(reloadToUpdate).not.toHaveBeenCalled();
  });

  it('aborts the start when a pending update commits a reload', async () => {
    const reloadToUpdate = vi.fn().mockResolvedValue(true);

    await expect(applyPendingUpdateBeforeOnlineStart(true, reloadToUpdate)).resolves.toBe(true);

    expect(reloadToUpdate).toHaveBeenCalledTimes(1);
  });

  it('lets the start proceed when no service worker is staged yet (reload no-op)', async () => {
    const reloadToUpdate = vi.fn().mockResolvedValue(false);

    await expect(applyPendingUpdateBeforeOnlineStart(true, reloadToUpdate)).resolves.toBe(false);

    expect(reloadToUpdate).toHaveBeenCalledTimes(1);
  });
});
