import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-rewrite',
      configureServer(server) {
        const handler = (req: any, _res: any, next: any) => {
          const url = req.url || '';
          if (url === '/admin' || url === '/admin/' || url.startsWith('/admin?') || url.startsWith('/admin/')) {
            req.url = '/admin.html';
          }
          next();
        };
        server.middlewares.stack.unshift({ route: '', handle: handler });
      },
    },
  ],
  assetsInclude: ['**/*.html'],
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, 'src/client'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/view': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
});
