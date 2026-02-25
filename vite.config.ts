import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    // The React plugin is required. Tailwind is configured via
    // postcss.config.mjs so the ESM-only plugin is not loaded here.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
