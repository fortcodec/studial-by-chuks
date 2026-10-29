import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import adminActionHandler from './api/admin/action.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'admin-action-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (
              req.url &&
              (req.url.startsWith('/api/admin') ||
                req.url.startsWith('/api/distribute-coins') ||
                req.url.startsWith('/api/delete-user') ||
                req.url.startsWith('/api/gift-coins'))
            ) {
              try {
                return await adminActionHandler(req, res);
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              }
            }
            next();
          });
        }
      }
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('react-markdown') || id.includes('katex') || id.includes('rehype') || id.includes('remark')) return 'markdown-vendor';
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
