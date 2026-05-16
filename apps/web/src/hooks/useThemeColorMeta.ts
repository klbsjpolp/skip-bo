import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
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
