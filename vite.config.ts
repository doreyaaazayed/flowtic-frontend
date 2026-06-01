import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

/*
 * CSP / Eval: Chromium may report blocked `unsafe-eval` while running `npm run dev`;
 * `@vite/client` HMR uses patterns that collide with strict `script-src` without
 * `'unsafe-eval'`. That is usually a dev-only finding—audit CSP against `vite preview`
 * or your deployed static bundle, not the dev server unless you widen the policy during dev.
 */
export default defineConfig({
  /** Required for Capacitor — assets load from file:// / app bundle */
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    /** Enables https:// for dev — required for Face ID camera on mobile browsers (LAN IP). */
    ...(process.env.VITE_HTTPS !== '0' ? [basicSsl()] : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Core React runtime (better caching vs one huge vendor chunk).
          if (id.includes('react-dom') || id.endsWith('/react/index.js')) return 'react-runtime';
          if (id.includes('/react/')) return 'react-runtime';
          if (id.includes('react-router')) return 'react-router';
          // Charts only load where Recharts mounts.
          if (id.includes('recharts')) return 'recharts';
          // Face ML only on Face ID route.
          if (id.includes('@vladmandic/human')) return 'human-ml';
          // Three/R3F + postprocessing (single chunk avoids circular refs).
          if (
            id.includes('@react-three') ||
            id.includes('/three/') ||
            id.includes('postprocessing')
          ) {
            return 'three-core';
          }
          // Animation libraries.
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('lenis')) return 'scroll';
          // MUI/emotion pulls a lot — rarely used on cosmic shell routes.
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  optimizeDeps: {
    include: ['@vladmandic/human'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Proxy API requests to backend in development so frontend and backend stay connected
  server: {
    port: Number(process.env.VITE_PORT) || 5174,
    /** Fail fast if the port is taken — run scripts/kill-flowtic-dev-ports.ps1 first. */
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      /** Face ID models — same-origin so desktop browsers don't hang on blocked CDN fetches */
      '/models/human': {
        target: 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/models\/human/, '/models'),
      },
    },
  },
})
