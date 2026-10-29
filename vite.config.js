import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'admin-stats-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url === '/api/admin/stats' || req.url.startsWith('/api/admin/stats?'))) {
              try {
                const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

                if (!supabaseUrl || !serviceRoleKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Missing service role key in .env' }));
                }

                const supabase = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { persistSession: false, autoRefreshToken: false }
                });

                const [p, posts, c] = await Promise.all([
                  supabase.from('profiles').select('*', { count: 'exact', head: true }),
                  supabase.from('posts').select('*', { count: 'exact', head: true }),
                  supabase.from('profiles').select('c_coins')
                ]);

                if (p.error) throw p.error;
                if (posts.error) throw posts.error;
                if (c.error) throw c.error;

                const totalStudents = p.count ?? 0;
                const activePosts = posts.count ?? 0;
                const totalCoins = (c.data || []).reduce((sum, r) => sum + (Number(r.c_coins) || 0), 0);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  totalStudents,
                  activePosts,
                  totalCoins,
                  timestamp: new Date().toISOString()
                }));
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
