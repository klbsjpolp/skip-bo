/**
 * Vitest setup — runs before each test file's module graph loads.
 *
 * Why this exists
 * ---------------
 * Node.js 22+ ships an experimental built-in `localStorage`/`sessionStorage`
 * global. In vitest's `jsdom` environment, the result is that
 * `window.localStorage` ends up as an empty `{}` object (no Storage
 * methods), and bare `localStorage` references throw
 * "localStorage.setItem is not a function".
 *
 * To keep the test suite Node-version agnostic, we install a tiny
 * Map-backed polyfill that conforms to the Storage interface and bind
 * it on both `window` and `globalThis`. The polyfill is per-file
 * (vitest's default `isolate: true` re-runs setup with a fresh
 * `window`), so tests cannot leak storage state between files.
 */

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const install = (key: 'localStorage' | 'sessionStorage') => {
  const existing = (globalThis as Record<string, unknown>)[key];
  const isUsable =
    existing != null &&
    typeof (existing as Storage).getItem === 'function' &&
    typeof (existing as Storage).setItem === 'function' &&
    typeof (existing as Storage).removeItem === 'function';
  if (isUsable) return;

  const polyfill = new MemoryStorage();
  Object.defineProperty(globalThis, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: polyfill,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: polyfill,
    });
  }
};

install('localStorage');
install('sessionStorage');

/**
 * jsdom doesn't implement the Pointer Events / ResizeObserver APIs that
 * Radix UI primitives (Select, Dialog, Popper, ...) call when opening or
 * positioning. Without these, opening a Radix Select in jsdom throws
 * "... is not a function".
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => undefined;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

/**
 * jsdom doesn't implement `matchMedia`, which `next-themes` calls to detect
 * the OS color-scheme preference.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
