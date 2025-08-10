import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import {themes} from "@/types";
import {CardAnimationProvider} from "@/contexts/CardAnimationContext.tsx";
import {CardAnimationLayer} from "@/components/CardAnimationLayer.tsx";
// @ts-expect-error - No types for this package
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // You could show a toast/button to reload
    updateSW(true) // immediately activate and reload
  },
  onOfflineReady() {
    // Optional: show a toast that the app is ready to work offline
    console.log('App ready to work offline')
  },
})

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
