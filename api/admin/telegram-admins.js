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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // GET: Fetch admins
  if (req.method === 'GET') {
    try {
      const supabase = getSupabaseAdmin();
      const { data: admins, error } = await supabase
        .from('telegram_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const payload = { admins: admins || [], count: admins?.length ?? 0 };
      if (res && typeof res.status === 'function') return res.status(200).json(payload);
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('[Telegram Admins API] GET error:', err);
      const payload = { error: err?.message || 'Failed to fetch Telegram admins.' };
      if (res && typeof res.status === 'function') return res.status(500).json(payload);
      return new Response(JSON.stringify(payload), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // POST: Add new admin
  if (req.method === 'POST') {
    try {
      const supabase = getSupabaseAdmin();
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) {}
      }
      if (!body && typeof req.json === 'function') {
        body = await req.json();
      }

      const { email, telegramUserId, name } = body || {};
      const parsedTelegramId = parseInt(telegramUserId, 10);
      if (!parsedTelegramId || isNaN(parsedTelegramId)) {
        const payload = { error: 'Please provide a valid numeric Telegram Chat ID.' };
        if (res && typeof res.status === 'function') return res.status(400).json(payload);
        return new Response(JSON.stringify(payload), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let resolvedName = (name || '').trim();

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

      const { data: newAdmin, error: insertErr } = await supabase
        .from('telegram_admins')
        .insert({
          telegram_user_id: parsedTelegramId,
          name: resolvedName,
        })
        .select()
        .maybeSingle();

      if (insertErr) throw insertErr;

      const payload = {
        success: true,
        message: `Authorized ${resolvedName} (ID: ${parsedTelegramId}) as Telegram Bot Admin.`,
        admin: newAdmin,
      };

      if (res && typeof res.status === 'function') return res.status(200).json(payload);
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('[Telegram Admins API] POST error:', err);
      const payload = { error: err?.message || 'Failed to authorize Telegram admin.' };
      if (res && typeof res.status === 'function') return res.status(500).json(payload);
      return new Response(JSON.stringify(payload), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // DELETE: Revoke admin
  if (req.method === 'DELETE') {
    try {
      const supabase = getSupabaseAdmin();
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) {}
      }
      if (!body && typeof req.json === 'function') {
        body = await req.json();
      }

      const { id } = body || {};
      if (!id) {
        const payload = { error: 'Missing admin ID to revoke.' };
        if (res && typeof res.status === 'function') return res.status(400).json(payload);
        return new Response(JSON.stringify(payload), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const { error } = await supabase.from('telegram_admins').delete().eq('id', id);
      if (error) throw error;

      const payload = { success: true, message: 'Revoked Telegram admin privileges.' };
      if (res && typeof res.status === 'function') return res.status(200).json(payload);
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('[Telegram Admins API] DELETE error:', err);
      const payload = { error: err?.message || 'Failed to revoke Telegram admin.' };
      if (res && typeof res.status === 'function') return res.status(500).json(payload);
      return new Response(JSON.stringify(payload), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const err = { error: 'Method not allowed' };
  if (res && typeof res.status === 'function') return res.status(405).json(err);
  return new Response(JSON.stringify(err), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
