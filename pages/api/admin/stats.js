import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

/**
 * Next.js Pages Router & Vercel Serverless API Route for /api/admin/stats
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
 */
export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'GET') {
    const err = { error: 'Method not allowed. Use GET.' };
    if (res && typeof res.status === 'function') {
      return res.status(405).json(err);
    }
    return new Response(JSON.stringify(err), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Admin Stats] Missing Supabase URL or service role key in environment.');
      const err = { error: 'Server configuration error: missing Supabase service role credentials.' };
      if (res && typeof res.status === 'function') {
        return res.status(500).json(err);
      }
      return new Response(JSON.stringify(err), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Initialize client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Three parallel queries
    const [studentsResult, postsResult, coinsResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('c_coins'),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (postsResult.error) throw postsResult.error;
    if (coinsResult.error) throw coinsResult.error;

    const totalStudents = studentsResult.count ?? 0;
    const activePosts = postsResult.count ?? 0;
    const totalCoins = (coinsResult.data || []).reduce(
      (sum, row) => sum + (Number(row.c_coins) || 0),
      0
    );

    const payload = {
      totalStudents,
      activePosts,
      totalCoins,
      timestamp: new Date().toISOString(),
    };

    if (res && typeof res.status === 'function') {
      return res.status(200).json(payload);
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[Admin Stats] Query error:', error);
    const err = { error: error?.message || 'Failed to fetch admin statistics.' };
    if (res && typeof res.status === 'function') {
      return res.status(500).json(err);
    }
    return new Response(JSON.stringify(err), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
