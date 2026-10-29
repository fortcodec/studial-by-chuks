import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

/**
 * POST /api/admin/delete-post
 * Deletes post bypassing RLS and delivers moderation notice to author
 * Body: { postId, reason }
 */
export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { postId, reason } = body;

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Missing postId parameter.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const removalReason = (reason || '').trim() || 'Violates campus community guidelines.';

    // 1. Fetch post info to determine author
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, content')
      .eq('id', postId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!post) {
      return new Response(
        JSON.stringify({ error: 'Post not found or already deleted.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Dismiss or delete associated post_reports if table exists
    try {
      await supabase.from('post_reports').delete().eq('post_id', postId);
    } catch (_) {}

    // 3. Delete the post from posts table
    const { error: deleteErr } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteErr) throw deleteErr;

    // 4. Insert notification to author in notifications table
    if (post.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: 'Post Removed by Moderator',
          message: `Your post was removed by a moderator. Reason: ${removalReason}`,
          type: 'moderation',
          read: false,
        });
      } catch (notifErr) {
        console.warn('[Admin Delete Post] Notification insert notice:', notifErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Post was removed and author received in-app notification.',
        postId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Admin Delete Post API] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to delete post.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
