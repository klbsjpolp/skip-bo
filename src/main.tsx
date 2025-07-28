import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import {themes} from "@/types";
import {CardAnimationProvider} from "@/contexts/CardAnimationContext.tsx";
import {CardAnimationLayer} from "@/components/CardAnimationLayer.tsx";

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        themes={themes.map(t => t.value)}
      >
        <CardAnimationProvider>
          <App />
          <CardAnimationLayer />
        </CardAnimationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
