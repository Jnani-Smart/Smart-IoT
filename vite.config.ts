import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Smart Home Dashboard',
        short_name: 'Smart Home',
        description: 'Control your smart home devices',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      dgram: path.resolve(__dirname, './src/utils/empty-module.js'),
      net: path.resolve(__dirname, './src/utils/empty-module.js'),
      tls: path.resolve(__dirname, './src/utils/empty-module.js'),
      fs: path.resolve(__dirname, './src/utils/empty-module.js'),
      os: path.resolve(__dirname, './src/utils/empty-module.js'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['lucide-react'],
  },
});