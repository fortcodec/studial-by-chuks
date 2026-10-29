import { createClient } from '@supabase/supabase-js';

let _supabase = null;
function getAdminClient() {
  if (_supabase) return _supabase;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Service Role Key is missing on the server.');
  }

  _supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

export default async function handler(req, res) {
  // Polyfill status & json if running under plain Node/Connect
  if (!res.status) {
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json');
      return this.end(JSON.stringify(data));
    };
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (initErr) {
    return res.status(500).json({ error: initErr.message });
  }

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let query = req.query;
  if (!query && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      query = Object.fromEntries(parsedUrl.searchParams.entries());
    } catch (_) {
      query = {};
    }
  }
  query = query || {};

  let body = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } else if (req.method === 'POST' || req.method === 'DELETE') {
    try {
      const bodyStr = await new Promise((resolve) => {
        let str = '';
        req.on('data', chunk => { str += chunk; });
        req.on('end', () => resolve(str));
      });
      if (bodyStr) body = JSON.parse(bodyStr);
    } catch (_) {}
  }

  // Determine action from body, query, or legacy URL path
  let action = body.action || query.action;
  if (!action && req.url) {
    if (req.url.includes('/economy')) action = 'economy';
    else if (req.url.includes('/delete-post')) action = 'delete_post';
    else if (req.url.includes('/telegram-admins')) action = 'telegram_admins';
    else if (req.url.includes('/distribute-coins')) action = 'distribute_coins';
    else if (req.url.includes('/delete-user')) action = 'delete_user';
    else if (req.url.includes('/gift-coins')) action = 'gift_coins';
    else if (req.url.includes('/stats') || req.url.includes('/admin-stats')) action = 'stats';
  }
  if (!action && req.method === 'GET') action = 'stats';

  try {
    switch (action) {
      // 1. Core Admin Stats
      case 'stats': {
        const [studentsRes, postsRes, coinsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('c_coins'),
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (postsRes.error) throw postsRes.error;
        if (coinsRes.error) throw coinsRes.error;

        const totalStudents = studentsRes.count ?? 0;
        const activePosts = postsRes.count ?? 0;
        const totalCoins = (coinsRes.data || []).reduce((acc, row) => acc + (Number(row.c_coins) || 0), 0);

        return res.status(200).json({
          totalStudents,
          activePosts,
          totalCoins,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Economy Overview
      case 'economy':
      case 'economy_stats': {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, full_name, email, avatar_url, c_coins')
          .order('c_coins', { ascending: false });

        if (pErr) throw pErr;

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

          const isDebit =
            tx.transaction_type === 'debit' ||
            numericAmt < 0 ||
            (tx.description && /unlock|pdf|spent|fee/i.test(tx.description));
          if (isDebit) totalBurned += Math.abs(numericAmt);

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

        return res.status(200).json({
          stats: { totalCoins, totalBurned, activeWallets },
          transactions: enrichedTransactions,
          users: safeProfiles.map((p) => ({
            id: p.id,
            username: p.username || 'student',
            full_name: p.full_name || p.username || 'Student',
            email: p.email || '',
            c_coins: Number(p.c_coins) || 0,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // 3. Mint / Airdrop Coins
      case 'mint':
      case 'mint_coins': {
        const { userId, userEmail, amount, description } = body;
        const mintAmount = parseInt(amount, 10);
        if (!mintAmount || mintAmount <= 0) {
          return res.status(400).json({ error: 'Please enter a valid positive number for coin minting.' });
        }

        let targetProfile = null;
        if (userId) {
          const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          targetProfile = data;
        }
        if (!targetProfile && userEmail?.trim()) {
          const { data } = await supabase.from('profiles').select('*').ilike('email', userEmail.trim()).maybeSingle();
          targetProfile = data;
        }
        if (!targetProfile) {
          return res.status(404).json({ error: 'Recipient student profile could not be found.' });
        }

        const currentBalance = Number(targetProfile.c_coins) || 0;
        const newBalance = currentBalance + mintAmount;
        const actionDesc = description?.trim() || 'Admin C-Coin Grant';

        const { error: uErr } = await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', targetProfile.id);
        if (uErr) throw uErr;

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

        return res.status(200).json({
          success: true,
          message: `Successfully minted ${mintAmount} C-Coins to @${targetProfile.username || targetProfile.full_name}.`,
          user: {
            id: targetProfile.id,
            username: targetProfile.username,
            full_name: targetProfile.full_name,
            c_coins: newBalance,
          },
          transaction: newTx,
        });
      }

      // 4. Delete Post & Notify Author
      case 'delete_post':
      case 'delete-post': {
        const { postId, reason } = body;
        if (!postId) return res.status(400).json({ error: 'Missing postId parameter.' });

        const removalReason = (reason || '').trim() || 'Violates campus community guidelines.';

        const { data: post, error: fErr } = await supabase
          .from('posts')
          .select('id, user_id, content')
          .eq('id', postId)
          .maybeSingle();

        if (fErr) throw fErr;
        if (!post) return res.status(404).json({ error: 'Post not found.' });

        try {
          await supabase.from('post_reports').delete().eq('post_id', postId);
        } catch (_) {}

        const { error: dErr } = await supabase.from('posts').delete().eq('id', postId);
        if (dErr) throw dErr;

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

        return res.status(200).json({
          success: true,
          message: 'Post was removed and author notified.',
          postId,
        });
      }

      // 5. Telegram Admins: Get
      case 'telegram_admins':
      case 'get_telegram_admins': {
        const { data: admins, error } = await supabase
          .from('telegram_admins')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ admins: admins || [], count: admins?.length ?? 0 });
      }

      // 6. Telegram Admins: Add
      case 'add_telegram_admin': {
        const { email, telegramUserId, name } = body;
        const parsedId = parseInt(telegramUserId, 10);
        if (!parsedId || isNaN(parsedId)) {
          return res.status(400).json({ error: 'Please provide a valid numeric Telegram Chat ID.' });
        }

        let resolvedName = (name || '').trim();
        if (email?.trim()) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, email')
            .ilike('email', email.trim())
            .maybeSingle();

          if (profile) resolvedName = resolvedName || profile.full_name || `@${profile.username}` || profile.email;
        }
        if (!resolvedName) resolvedName = `Admin-${String(parsedId).slice(-4)}`;

        const { data: newAdmin, error } = await supabase
          .from('telegram_admins')
          .insert({ telegram_user_id: parsedId, name: resolvedName })
          .select()
          .maybeSingle();

        if (error) throw error;

        return res.status(200).json({
          success: true,
          message: `Authorized ${resolvedName} (ID: ${parsedId})`,
          admin: newAdmin,
        });
      }

      // 7. Telegram Admins: Revoke
      case 'revoke_telegram_admin': {
        const id = body.id || query.id;
        if (!id) return res.status(400).json({ error: 'Missing admin ID' });

        const { error } = await supabase.from('telegram_admins').delete().eq('id', id);
        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Revoked Telegram admin privileges.' });
      }

      // 8. Delete User
      case 'delete_user': {
        const { userId } = body;
        if (!userId) return res.status(400).json({ error: 'Missing userId parameter.' });

        const { data, error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        return res.status(200).json({ status: 'success', data });
      }

      // 9. Distribute Coins
      case 'distribute_coins': {
        const amount = Number(body.amount) || 500;
        const { data: students, error: fetchError } = await supabase
          .from('profiles')
          .select('id, c_coins')
          .eq('role', 'student');

        if (fetchError) throw fetchError;
        if (!students || students.length === 0) {
          return res.status(200).json({ status: 'ok', message: 'No students found.' });
        }

        const customMessage = body.message?.trim() || `You received ${amount} C-Coins for the week from admin! Keep up the great work!`;
        const CHUNK_SIZE = 50;
        for (let i = 0; i < students.length; i += CHUNK_SIZE) {
          const chunk = students.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map(async (student) => {
              const newBalance = (student.c_coins || 0) + amount;
              await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', student.id);
              await supabase.from('c_coin_transactions').insert({
                user_id: student.id,
                amount: `+${amount} C`,
                description: 'Weekly Drop / Reward',
              });
              await supabase.from('notifications').insert({
                user_id: student.id,
                title: `Weekly Drop: ${amount} C-Coins`,
                message: customMessage,
                type: 'weekly_drop',
                read: false,
              });
            })
          );
        }

        return res.status(200).json({ status: 'success', distributedTo: students.length, amount });
      }

      // 10. Gift Coins
      case 'gift_coins': {
        const giftAmount = Number(body.amount) || 0;
        if (giftAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

        let studentsToGift = [];
        if (body.targetUserId === 'ALL') {
          const { data, error } = await supabase.from('profiles').select('id, c_coins').eq('role', 'student');
          if (error) throw error;
          studentsToGift = data || [];
        } else {
          const { data, error } = await supabase.from('profiles').select('id, c_coins').eq('id', body.targetUserId).single();
          if (error) throw error;
          if (data) studentsToGift = [data];
        }

        const notificationMessage = body.message?.trim() || `You have received a gift of ${giftAmount} C-Coins!`;
        const CHUNK_SIZE = 50;
        for (let i = 0; i < studentsToGift.length; i += CHUNK_SIZE) {
          const chunk = studentsToGift.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map(async (student) => {
              const newBalance = (student.c_coins || 0) + giftAmount;
              await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', student.id);
              await supabase.from('c_coin_transactions').insert({
                user_id: student.id,
                amount: `+${giftAmount} C`,
                description: 'Admin Gift / Reward',
              });
              await supabase.from('notifications').insert({
                user_id: student.id,
                title: `Gift: ${giftAmount} C-Coins`,
                message: notificationMessage,
                type: 'admin_gift',
                read: false,
              });
            })
          );
        }

        return res.status(200).json({ status: 'success', giftedCount: studentsToGift.length, amount: giftAmount });
      }

      // 11. Approve Task
      case 'approve_task': {
        const { submissionId, adminId } = body;
        if (!submissionId) return res.status(400).json({ error: 'Missing submission ID' });

        const { data: submission, error: fetchError } = await supabase
          .from('task_submissions')
          .select('*, tasks(title, reward_coins)')
          .eq('id', submissionId)
          .single();

        if (fetchError || !submission) return res.status(404).json({ error: 'Submission not found' });
        if (submission.status === 'approved') return res.status(400).json({ error: 'Already approved' });

        const rewardAmount = submission.tasks?.reward_coins || 0;
        const userId = submission.user_id;

        const { error: updateError } = await supabase
          .from('task_submissions')
          .update({ status: 'approved' })
          .eq('id', submissionId);

        if (updateError) throw updateError;

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('c_coins')
          .eq('id', userId)
          .single();

        const currentCoins = userProfile?.c_coins || 0;
        const newBalance = currentCoins + rewardAmount;

        await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', userId);

        await supabase.from('c_coin_transactions').insert({
          user_id: userId,
          amount: `+${rewardAmount} C`,
          description: `Task Approved: ${submission.tasks?.title || 'Unknown Task'}`,
        });

        await supabase.from('notifications').insert({
          user_id: userId,
          title: `Task Approved! ${rewardAmount} C-Coins`,
          message: `Your proof for "${submission.tasks?.title}" was verified by an admin. You earned ${rewardAmount} C-Coins!`,
          type: 'task_approved',
          read: false,
        });

        return res.status(200).json({ status: 'success', message: 'Task approved and reward distributed.' });
      }

      default: {
        return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }
  } catch (err) {
    console.error('[Admin Action API Error]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
