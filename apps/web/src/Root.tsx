import App from "@/App.tsx";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import type {Theme} from "@/types";
import { themes} from "@/types";
import {CardAnimationProvider} from "@/contexts/CardAnimationContext.tsx";
import {CardAnimationLayer} from "@/components/CardAnimationLayer.tsx";
import React from "react";

const queryClient = new QueryClient()

function Root() {
    return <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme={'theme-light' satisfies Theme}
                themes={themes.map(t => t.value)}
            >
                <CardAnimationProvider>
                    <App />
                    <CardAnimationLayer />
                </CardAnimationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
}

export default Root;