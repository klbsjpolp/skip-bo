import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      // A theme may tint the page separately from the board via `--theme-color`
      // (see `#root` in base.css); otherwise the board colour is the page colour.
      const styles = getComputedStyle(document.documentElement);
      const background =
        styles.getPropertyValue('--theme-color').trim() || styles.getPropertyValue('--background').trim();
      if (!background) return;

      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = background;
    });
    return () => cancelAnimationFrame(handle);
  }, [resolvedTheme]);
}
