import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role credentials in environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    const err = { error: 'Method not allowed' };
    if (res && typeof res.status === 'function') return res.status(405).json(err);
    return new Response(JSON.stringify(err), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = getSupabaseAdmin();
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    if (!body && typeof req.json === 'function') {
      body = await req.json();
    }

    const { postId, reason } = body || {};
    if (!postId) {
      const err = { error: 'Missing postId parameter.' };
      if (res && typeof res.status === 'function') return res.status(400).json(err);
      return new Response(JSON.stringify(err), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const removalReason = (reason || '').trim() || 'Violates campus community guidelines.';

    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, content')
      .eq('id', postId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!post) {
      const err = { error: 'Post not found or already deleted.' };
      if (res && typeof res.status === 'function') return res.status(404).json(err);
      return new Response(JSON.stringify(err), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      await supabase.from('post_reports').delete().eq('post_id', postId);
    } catch (_) {}

    const { error: deleteErr } = await supabase.from('posts').delete().eq('id', postId);
    if (deleteErr) throw deleteErr;

    if (post.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: 'Post Removed by Moderator',
          message: `Your post was removed by a moderator. Reason: ${removalReason}`,
          type: 'moderation',
          read: false,
        });
      } catch (_) {}
    }

    const success = {
      success: true,
      message: 'Post was removed and author received in-app notification.',
      postId,
    };

    if (res && typeof res.status === 'function') return res.status(200).json(success);
    return new Response(JSON.stringify(success), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[Delete Post Handler] Error:', error);
    const err = { error: error?.message || 'Failed to delete post.' };
    if (res && typeof res.status === 'function') return res.status(500).json(err);
    return new Response(JSON.stringify(err), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
