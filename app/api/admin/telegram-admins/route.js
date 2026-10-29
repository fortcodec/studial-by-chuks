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
 * GET /api/admin/telegram-admins
 * Fetches all authorized Telegram Bot Admins
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: admins, error } = await supabase
      .from('telegram_admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        admins: admins || [],
        count: admins?.length ?? 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Telegram Admins API] GET error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to fetch Telegram admins.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/admin/telegram-admins
 * Authorizes a new Telegram Bot Admin
 * Body: { email, telegramUserId, name }
 */
export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { email, telegramUserId, name } = body;

    const parsedTelegramId = parseInt(telegramUserId, 10);
    if (!parsedTelegramId || isNaN(parsedTelegramId)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid numeric Telegram Chat ID.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let resolvedName = (name || '').trim();

    // If an email was provided, try linking to an existing student profile
    if (email?.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .ilike('email', email.trim())
        .maybeSingle();

      if (profile) {
        resolvedName = resolvedName || profile.full_name || `@${profile.username}` || profile.email;
      } else if (!resolvedName) {
        resolvedName = email.trim().split('@')[0];
      }
    }

    if (!resolvedName) {
      resolvedName = `Admin-${String(parsedTelegramId).slice(-4)}`;
    }

    // Insert into telegram_admins table
    const { data: newAdmin, error: insertErr } = await supabase
      .from('telegram_admins')
      .insert({
        telegram_user_id: parsedTelegramId,
        name: resolvedName,
      })
      .select()
      .maybeSingle();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Authorized ${resolvedName} (ID: ${parsedTelegramId}) as Telegram Bot Admin.`,
        admin: newAdmin,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Telegram Admins API] POST error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to authorize Telegram admin.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * DELETE /api/admin/telegram-admins
 * Revokes Telegram Bot Admin authorization
 * Body: { id }
 */
export async function DELETE(req) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing admin ID to revoke.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase.from('telegram_admins').delete().eq('id', id);
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Revoked Telegram admin privileges.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Telegram Admins API] DELETE error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to revoke Telegram admin.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
