import { createClient } from '@supabase/supabase-js';

// Configure execution duration for serverless function
export const maxDuration = 30;

/**
 * Backend Service Role API for Studial Admin Aggregate Statistics
 * 
 * Bypasses Row Level Security (RLS) using the SUPABASE_SERVICE_ROLE_KEY
 * to compute 100% accurate, live database aggregate counts for:
 * - Profiles (Total & Students)
 * - Active Posts
 * - True C-Coins in Circulation (paginated sum across all profiles)
 * - Telegram Admins
 * - Pending Moderation Reports
 * - Pending Task Submissions
 */
export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    const errorMsg = 'Method not allowed. Use GET or POST.';
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ error: errorMsg });
    }
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Admin Stats API] Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL');
      const errPayload = {
        error: 'CONFIGURATION_ERROR',
        message: 'Server missing Supabase service role credentials.',
      };
      if (res && typeof res.status === 'function') {
        return res.status(500).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize backend client with Service Role Key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Concurrent aggregate queries with exact counts
    const [
      studentsRes,
      allProfilesRes,
      postsRes,
      telegramRes,
      reportsRes,
      tasksRes
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('telegram_admins').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
      supabaseAdmin.from('post_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').catch(() => ({ count: 0 })),
      supabaseAdmin.from('task_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending').catch(() => ({ count: 0 })),
    ]);

    // 2. Compute true total C-Coins across all profiles with pagination to bypass Supabase 1,000 row limits
    let totalCoins = 0;
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: coinBatch, error: coinError } = await supabaseAdmin
        .from('profiles')
        .select('c_coins')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (coinError || !coinBatch || coinBatch.length === 0) break;

      for (let i = 0; i < coinBatch.length; i++) {
        totalCoins += Number(coinBatch[i].c_coins) || 0;
      }

      if (coinBatch.length < pageSize) break;
      page++;
    }

    const totalStudents = studentsRes.count !== null && studentsRes.count !== undefined 
      ? studentsRes.count 
      : (allProfilesRes.count || 0);

    const activePosts = postsRes.count !== null && postsRes.count !== undefined 
      ? postsRes.count 
      : 0;

    const telegramAdmins = telegramRes?.count !== null && telegramRes?.count !== undefined 
      ? telegramRes.count 
      : 0;

    const pendingReports = reportsRes?.count !== null && reportsRes?.count !== undefined 
      ? reportsRes.count 
      : 0;

    const pendingTasks = tasksRes?.count !== null && tasksRes?.count !== undefined 
      ? tasksRes.count 
      : 0;

    const statsPayload = {
      success: true,
      stats: {
        totalStudents,
        totalProfiles: allProfilesRes.count || 0,
        activePosts,
        totalCoins,
        telegramAdmins,
        pendingReports,
        pendingTasks,
        timestamp: new Date().toISOString(),
      },
    };

    if (res && typeof res.status === 'function') {
      return res.status(200).json(statsPayload);
    }
    return new Response(JSON.stringify(statsPayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Admin Stats API] Fatal error:', error);
    const errPayload = {
      success: false,
      error: 'SERVER_ERROR',
      message: error?.message || 'Failed to fetch admin stats.',
    };
    if (res && typeof res.status === 'function') {
      return res.status(500).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
