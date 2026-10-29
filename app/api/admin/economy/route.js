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
 * GET /api/admin/economy
 * Returns:
 * - totalCoins (Circulation)
 * - totalBurned (Used for PDFs / Unlocks)
 * - activeWallets (Wallets with positive balance)
 * - transactions (Ledger history with profile info)
 * - users (Student directory for minting)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch profiles for circulation & active wallets
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

    // If no profiles have > 0 coins yet, set active wallets to total profiles count
    if (activeWallets === 0 && safeProfiles.length > 0) {
      activeWallets = safeProfiles.length;
    }

    // 2. Fetch recent transactions for Ledger and Burned Coins calculation
    const { data: transactions, error: txErr } = await supabase
      .from('c_coin_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Don't crash if transactions table is empty or has schema variations
    const safeTx = transactions || [];
    let totalBurned = 0;

    const enrichedTransactions = safeTx.map((tx) => {
      // Parse numeric amount safely (handles "+50 C", "-50", -50)
      let rawAmt = tx.amount;
      let numericAmt = 0;
      if (typeof rawAmt === 'number') {
        numericAmt = rawAmt;
      } else if (typeof rawAmt === 'string') {
        const cleaned = rawAmt.replace(/[^0-9.-]/g, '');
        numericAmt = parseFloat(cleaned) || 0;
        if (rawAmt.trim().startsWith('-')) numericAmt = -Math.abs(numericAmt);
      }

      // If marked as debit or negative amount, add to burned count
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

    return new Response(
      JSON.stringify({
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
    console.error('[Admin Economy API] GET error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to fetch economy statistics.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/admin/economy
 * Handles 'Airdrop/Mint Coins' to user's wallet
 * Body: { userId, amount, description }
 */
export async function POST(req) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { userId, userEmail, amount, description } = body;

    const mintAmount = parseInt(amount, 10);
    if (!mintAmount || mintAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid positive number for coin minting.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Locate target user by ID or Email
    let targetProfile = null;
    if (userId) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!error && data) targetProfile = data;
    }

    if (!targetProfile && userEmail) {
      const { data, error } = await supabase.from('profiles').select('*').ilike('email', userEmail.trim()).maybeSingle();
      if (!error && data) targetProfile = data;
    }

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not find a student account matching the provided ID or email.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentBalance = Number(targetProfile.c_coins) || 0;
    const newBalance = currentBalance + mintAmount;
    const actionDesc = description?.trim() || 'Admin Mint / Airdrop';

    // 1. Update Profile Balance
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ c_coins: newBalance })
      .eq('id', targetProfile.id);

    if (updateErr) throw updateErr;

    // 2. Insert into Ledger (c_coin_transactions)
    const { data: newTx, error: txErr } = await supabase
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

    if (txErr) {
      console.warn('[Admin Economy API] Transaction record warning:', txErr.message);
    }

    // 3. Optional notification to student
    try {
      await supabase.from('notifications').insert({
        user_id: targetProfile.id,
        type: 'reward',
        title: 'C-Coins Airdropped! 🎉',
        content: `You received +${mintAmount} C-Coins from campus administration (${actionDesc}).`,
      });
    } catch (notifErr) {
      console.warn('[Admin Economy API] Notification insert notice:', notifErr?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully minted ${mintAmount} C-Coins to @${targetProfile.username || targetProfile.full_name}.`,
        user: {
          id: targetProfile.id,
          username: targetProfile.username,
          full_name: targetProfile.full_name,
          c_coins: newBalance,
        },
        transaction: newTx,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Admin Economy API] POST error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to process mint action.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
