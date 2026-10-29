import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Next.js App Router API Route for /api/admin/stats
 * Bypasses Row Level Security (RLS) via SUPABASE_SERVICE_ROLE_KEY
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Admin Stats] Missing Supabase URL or service role key in environment.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase service role credentials.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client using service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Run parallel queries to get exact counts
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

    return new Response(
      JSON.stringify({
        totalStudents,
        activePosts,
        totalCoins,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[Admin Stats] Query error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to fetch admin statistics.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
