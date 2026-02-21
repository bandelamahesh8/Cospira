import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "localhost+3-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost+3.pem")),
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        secure: false,
        changeOrigin: true,
        rejectUnauthorized: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        secure: false,
        changeOrigin: true,
        ws: true,
        rejectUnauthorized: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('mediasoup-client') || id.includes('socket.io-client')) {
              return 'webrtc-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
          }
        },
      },
    },
  },
}));
