import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Treat .geojson files as JSON so Vite/Rolldown can import them directly.
    {
      name: 'geojson-loader',
      transform(code, id) {
        if (!id.endsWith('.geojson')) return null;
        // Parse + re-export as an ES module default export
        return {
          code: `export default ${code}`,
          map: null,
        };
      },
    },
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 1600,
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
