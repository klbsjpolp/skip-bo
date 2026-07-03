import type { Card } from '@skipbo/game-core';

/**
 * Debug override: force the AI's hand via the `aiHand` query param.
 * Supports `[1,2,3,4,5]`, `1,2,3,4,5`, and `1-2-3-4-5`. Consulted when the
 * turn machine is set up (`useSkipBoGame` passes it as machine input); the
 * machine itself never touches the URL.
 */
export const getAiHandOverride = (search?: string): Card[] | null => {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (!query) {
    return null;
  }

  try {
    const raw = new URLSearchParams(query).get('aiHand');
    if (!raw) {
      return null;
    }

    let numbers: number[] = [];

    // 1) Try JSON array first (e.g., "[1,2,3,4,5]")
    try {
      const maybe: unknown = JSON.parse(raw);
      if (Array.isArray(maybe)) {
        numbers = maybe
          .map((n) => (typeof n === 'string' ? parseInt(n, 10) : Number(n)))
          .filter((n) => Number.isFinite(n) && n >= 1);
      }
    } catch {
      // Not JSON, fall through
    }

    // 2) Fallback: remove brackets/spaces and split by comma or dash
    if (numbers.length === 0) {
      const cleaned = raw.replace(/\[/g, '').replace(/]/g, '').replace(/\s/g, '');
      const tokens = cleaned.split(/[,-]/).filter(Boolean);
      numbers = tokens.map((t) => parseInt(t, 10)).filter((n) => Number.isFinite(n) && n >= 1);
    }

    if (numbers.length > 0) {
      return numbers.map((v) => ({ value: v, isSkipBo: false }));
    }
  } catch {
    /* ignore invalid aiHand param */
  }

  return null;
};
