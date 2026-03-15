import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import fs from "fs";

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
    envDir: securityDir,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
    dedupe: ['react', 'react-dom'],
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
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // Group smaller dependencies together
            return 'vendor';
          }
        },
      },
    },
    // Performance optimizations
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    reportCompressedSize: false,
  },
  // Development performance optimizations
  server: {
    host: "::",
    port: 8080,
    https: (fs.existsSync(path.join(securityDir, ".env")) && 
            fs.readFileSync(path.join(securityDir, ".env"), "utf8").includes("FORCE_HTTP=true")) 
            ? undefined 
            : {
                key: fs.readFileSync(path.join(securityDir, "localhost+3-key.pem")),
                cert: fs.readFileSync(path.join(securityDir, "localhost+3.pem")),
              },
    proxy: {
      '/api': {
        target: (fs.existsSync(path.join(securityDir, ".env")) && 
                fs.readFileSync(path.join(securityDir, ".env"), "utf8").includes("FORCE_HTTP=true"))
                ? 'http://localhost:3001'
                : 'https://localhost:3001',
        secure: false,
        changeOrigin: true,
        rejectUnauthorized: false,
      },
    '/upload': {
      target: (fs.existsSync(path.join(securityDir, ".env")) && 
              fs.readFileSync(path.join(securityDir, ".env"), "utf8").includes("FORCE_HTTP=true"))
              ? 'http://localhost:3001'
              : 'https://localhost:3001',
      secure: false,
      changeOrigin: true,
      rejectUnauthorized: false,
    },
    '/uploads': {
      target: (fs.existsSync(path.join(securityDir, ".env")) && 
              fs.readFileSync(path.join(securityDir, ".env"), "utf8").includes("FORCE_HTTP=true"))
              ? 'http://localhost:3001'
              : 'https://localhost:3001',
      secure: false,
      changeOrigin: true,
      rejectUnauthorized: false,
    },
    '/socket.io': {
      target: (fs.existsSync(path.join(securityDir, ".env")) && 
              fs.readFileSync(path.join(securityDir, ".env"), "utf8").includes("FORCE_HTTP=true"))
              ? 'http://localhost:3001'
              : 'https://localhost:3001',
      secure: false,
      changeOrigin: true,
      ws: true,
      rejectUnauthorized: false,
    },
  },
  },
  // Enable HMR optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'socket.io-client',
      'zustand',
      'framer-motion',
    ],
    exclude: ['@ffmpeg-installer/ffmpeg']
  },
}));
