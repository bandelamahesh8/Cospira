import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';
const securityDirExists = fs.existsSync(securityDir);

// Determine if FORCE_HTTP is set in the local .env
const envFilePath = path.join(securityDir, '.env');
const forceHttp = securityDirExists &&
  fs.existsSync(envFilePath) &&
  fs.readFileSync(envFilePath, 'utf8').includes('FORCE_HTTP=true');

// Only load SSL certs if the security directory exists and FORCE_HTTP is not set
const sslKeyPath = path.join(securityDir, 'localhost+3-key.pem');
const sslCertPath = path.join(securityDir, 'localhost+3.pem');
const useHttps = securityDirExists && !forceHttp &&
  fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

const httpsConfig = useHttps
  ? { key: fs.readFileSync(sslKeyPath), cert: fs.readFileSync(sslCertPath) }
  : undefined;

const backendTarget = useHttps ? 'https://localhost:3001' : 'http://localhost:3001';

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  // Only use the security dir as envDir when it actually exists locally
  ...(securityDirExists ? { envDir: securityDir } : {}),
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
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
    https: httpsConfig,
    proxy: {
      '/api': {
        target: backendTarget,
        secure: false,
        changeOrigin: true,
        rejectUnauthorized: false,
      },
      '/upload': {
        target: backendTarget,
        secure: false,
        changeOrigin: true,
        rejectUnauthorized: false,
      },
      '/uploads': {
        target: backendTarget,
        secure: false,
        changeOrigin: true,
        rejectUnauthorized: false,
      },
      '/socket.io': {
        target: backendTarget,
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
