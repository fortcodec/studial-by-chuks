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

  // GET: Fetch Economy Statistics & Ledger
  if (req.method === 'GET') {
    try {
      const supabase = getSupabaseAdmin();

      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, avatar_url, c_coins')
        .order('c_coins', { ascending: false });

      if (profilesErr) throw profilesErr;

      const safeProfiles = profiles || [];
      const profileMap = new Map();
      let totalCoins = 0;
      let activeWallets = 0;

      for (const p of safeProfiles) {
        profileMap.set(p.id, p);
        const coins = Number(p.c_coins) || 0;
        if (coins > 0) {
          totalCoins += coins;
          activeWallets += 1;
        }
      }

      if (activeWallets === 0 && safeProfiles.length > 0) {
        activeWallets = safeProfiles.length;
      }

      const { data: transactions } = await supabase
        .from('c_coin_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const safeTx = transactions || [];
      let totalBurned = 0;

      const enrichedTransactions = safeTx.map((tx) => {
        let rawAmt = tx.amount;
        let numericAmt = 0;
        if (typeof rawAmt === 'number') {
          numericAmt = rawAmt;
        } else if (typeof rawAmt === 'string') {
          const cleaned = rawAmt.replace(/[^0-9.-]/g, '');
          numericAmt = parseFloat(cleaned) || 0;
          if (rawAmt.trim().startsWith('-')) numericAmt = -Math.abs(numericAmt);
        }

        const isDebit = tx.transaction_type === 'debit' || numericAmt < 0 || (tx.description && /unlock|pdf|spent|fee/i.test(tx.description));
        if (isDebit) {
          totalBurned += Math.abs(numericAmt);
        }

        const user = profileMap.get(tx.user_id) || {
          id: tx.user_id,
          username: 'Unknown User',
          full_name: 'Student',
          email: 'N/A',
        };

        return {
          id: tx.id,
          user_id: tx.user_id,
          amount: numericAmt,
          displayAmount: tx.amount,
          transaction_type: tx.transaction_type || (numericAmt < 0 ? 'debit' : 'credit'),
          description: tx.description || 'Transaction',
          reference: tx.reference || null,
          created_at: tx.created_at || new Date().toISOString(),
          user,
        };
      });

      const responsePayload = {
        stats: {
          totalCoins,
          totalBurned,
          activeWallets,
        },
        transactions: enrichedTransactions,
        users: safeProfiles.map((p) => ({
          id: p.id,
          username: p.username || 'student',
          full_name: p.full_name || p.username || 'Student',
          email: p.email || '',
          c_coins: Number(p.c_coins) || 0,
        })),
        timestamp: new Date().toISOString(),
      };

      if (res && typeof res.status === 'function') {
        return res.status(200).json(responsePayload);
      }
      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('[Pages Admin Economy] GET error:', err);
      const errPayload = { error: err?.message || 'Failed to fetch economy stats' };
      if (res && typeof res.status === 'function') return res.status(500).json(errPayload);
      return new Response(JSON.stringify(errPayload), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // POST: Airdrop/Mint Coins
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
      const { userId, userEmail, amount, description } = body || {};

      const mintAmount = parseInt(amount, 10);
      if (!mintAmount || mintAmount <= 0) {
        const err = { error: 'Please enter a valid positive number for coin minting.' };
        if (res && typeof res.status === 'function') return res.status(400).json(err);
        return new Response(JSON.stringify(err), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let targetProfile = null;
      if (userId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (data) targetProfile = data;
      }
      if (!targetProfile && userEmail) {
        const { data } = await supabase.from('profiles').select('*').ilike('email', userEmail.trim()).maybeSingle();
        if (data) targetProfile = data;
      }

      if (!targetProfile) {
        const err = { error: 'Could not find a student account matching the provided ID or email.' };
        if (res && typeof res.status === 'function') return res.status(404).json(err);
        return new Response(JSON.stringify(err), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const currentBalance = Number(targetProfile.c_coins) || 0;
      const newBalance = currentBalance + mintAmount;
      const actionDesc = description?.trim() || 'Admin Mint / Airdrop';

      await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', targetProfile.id);

      const { data: newTx } = await supabase
        .from('c_coin_transactions')
        .insert({
          user_id: targetProfile.id,
          amount: mintAmount,
          transaction_type: 'credit',
          description: actionDesc,
          reference: `admin_mint_${Date.now()}`,
        })
        .select()
        .maybeSingle();

      try {
        await supabase.from('notifications').insert({
          user_id: targetProfile.id,
          type: 'reward',
          title: 'C-Coins Airdropped! 🎉',
          content: `You received +${mintAmount} C-Coins from campus administration (${actionDesc}).`,
        });
      } catch (_) {}

      const successPayload = {
        success: true,
        message: `Successfully minted ${mintAmount} C-Coins to @${targetProfile.username || targetProfile.full_name}.`,
        user: {
          id: targetProfile.id,
          username: targetProfile.username,
          full_name: targetProfile.full_name,
          c_coins: newBalance,
        },
        transaction: newTx,
      };

      if (res && typeof res.status === 'function') return res.status(200).json(successPayload);
      return new Response(JSON.stringify(successPayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('[Pages Admin Economy] POST error:', err);
      const errPayload = { error: err?.message || 'Failed to process mint action.' };
      if (res && typeof res.status === 'function') return res.status(500).json(errPayload);
      return new Response(JSON.stringify(errPayload), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const notAllowed = { error: 'Method not allowed' };
  if (res && typeof res.status === 'function') return res.status(405).json(notAllowed);
  return new Response(JSON.stringify(notAllowed), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
