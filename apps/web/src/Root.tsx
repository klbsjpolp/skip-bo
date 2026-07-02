import App from '@/App.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { Theme } from '@skipbo/game-core';
import { themes } from '@skipbo/game-core';
import { CardAnimationProvider } from '@/contexts/CardAnimationContext.tsx';
import { DragProvider } from '@/contexts/DragContext.tsx';
import { CardAnimationLayer } from '@/components/CardAnimationLayer.tsx';
import { DragGhost } from '@/components/DragGhost.tsx';
import { migrateLegacyThemeValue } from '@/lib/themeMigration';
import React from 'react';

// Runs once on bundle load, before next-themes hydrates from localStorage.
migrateLegacyThemeValue();

const queryClient = new QueryClient();

function Root() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme={'theme-rummy' satisfies Theme}
          themes={themes.map((t) => t.value)}
        >
          <CardAnimationProvider>
            <DragProvider>
              <App />
              <CardAnimationLayer />
              <DragGhost />
            </DragProvider>
          </CardAnimationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default Root;
