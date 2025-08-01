import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react-swc";
import path from 'path'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  // IMPORTANT: Set base path for GitHub Pages
  // Replace 'skip-bo' with your actual repository name
  base: process.env.NODE_ENV === 'production' ? '/skip-bo/' : '/',

  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
