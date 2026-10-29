import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'admin-stats-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url === '/api/admin/stats' || req.url.startsWith('/api/admin/stats?'))) {
              try {
                const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

                if (!supabaseUrl || !serviceRoleKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Missing service role key in .env' }));
                }

                const supabase = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { persistSession: false, autoRefreshToken: false }
                });

                const [p, posts, c] = await Promise.all([
                  supabase.from('profiles').select('*', { count: 'exact', head: true }),
                  supabase.from('posts').select('*', { count: 'exact', head: true }),
                  supabase.from('profiles').select('c_coins')
                ]);

                if (p.error) throw p.error;
                if (posts.error) throw posts.error;
                if (c.error) throw c.error;

                const totalStudents = p.count ?? 0;
                const activePosts = posts.count ?? 0;
                const totalCoins = (c.data || []).reduce((sum, r) => sum + (Number(r.c_coins) || 0), 0);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  totalStudents,
                  activePosts,
                  totalCoins,
                  timestamp: new Date().toISOString()
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              }
            }

            // Economy Admin Dev API handler
            if (req.url && (req.url === '/api/admin/economy' || req.url.startsWith('/api/admin/economy?'))) {
              try {
                const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

                if (!supabaseUrl || !serviceRoleKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Missing service role credentials.' }));
                }

                const supabase = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { persistSession: false, autoRefreshToken: false }
                });

                if (req.method === 'GET') {
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

                    const isDebit = tx.transaction_type === 'debit' || numericAmt < 0 || (tx.description && /unlock|pdf|spent|fee/i.test(tx.description));
                    if (isDebit) {
                      totalBurned += Math.abs(numericAmt);
                    }

                    const user = profileMap.get(tx.user_id) || {
                      id: tx.user_id,
                      username: 'Unknown User',
                      full_name: 'Student',
                      email: 'N/A'
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
                      user
                    };
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    stats: { totalCoins, totalBurned, activeWallets },
                    transactions: enrichedTransactions,
                    users: safeProfiles.map((p) => ({
                      id: p.id,
                      username: p.username || 'student',
                      full_name: p.full_name || p.username || 'Student',
                      email: p.email || '',
                      c_coins: Number(p.c_coins) || 0
                    })),
                    timestamp: new Date().toISOString()
                  }));
                }

                if (req.method === 'POST') {
                  let bodyStr = '';
                  req.on('data', chunk => { bodyStr += chunk; });
                  req.on('end', async () => {
                    try {
                      const parsed = JSON.parse(bodyStr || '{}');
                      const { userId, userEmail, amount, description } = parsed;
                      const mintAmount = parseInt(amount, 10);

                      if (!mintAmount || mintAmount <= 0) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({ error: 'Please enter a valid positive number for coin minting.' }));
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
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({ error: 'Could not find a student account matching the provided ID or email.' }));
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
                          reference: `admin_mint_${Date.now()}`
                        })
                        .select()
                        .maybeSingle();

                      try {
                        await supabase.from('notifications').insert({
                          user_id: targetProfile.id,
                          type: 'reward',
                          title: 'C-Coins Airdropped! 🎉',
                          content: `You received +${mintAmount} C-Coins from campus administration (${actionDesc}).`
                        });
                      } catch (_) {}

                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({
                        success: true,
                        message: `Successfully minted ${mintAmount} C-Coins to @${targetProfile.username || targetProfile.full_name}.`,
                        user: {
                          id: targetProfile.id,
                          username: targetProfile.username,
                          full_name: targetProfile.full_name,
                          c_coins: newBalance
                        },
                        transaction: newTx
                      }));
                    } catch (pErr) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ error: pErr?.message || 'Failed to mint coins.' }));
                    }
                  });
                  return;
                }
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              }
            }

            // Delete Post & Notify Author Dev API handler
            if (req.url && req.url === '/api/admin/delete-post' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
                  const supabase = createClient(supabaseUrl, serviceRoleKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                  });

                  const { postId, reason } = JSON.parse(bodyStr || '{}');
                  if (!postId) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Missing postId parameter.' }));
                  }

                  const removalReason = (reason || '').trim() || 'Violates campus community guidelines.';

                  const { data: post } = await supabase.from('posts').select('id, user_id, content').eq('id', postId).maybeSingle();
                  if (!post) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Post not found.' }));
                  }

                  try { await supabase.from('post_reports').delete().eq('post_id', postId); } catch (_) {}
                  await supabase.from('posts').delete().eq('id', postId);

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

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: true, message: 'Post was removed and author notified.', postId }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: err?.message || 'Server error deleting post' }));
                }
              });
              return;
            }

            // Telegram Admins Dev API handler
            if (req.url && (req.url === '/api/admin/telegram-admins' || req.url.startsWith('/api/admin/telegram-admins?'))) {
              try {
                const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
                const supabase = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { persistSession: false, autoRefreshToken: false }
                });

                if (req.method === 'GET') {
                  const { data: admins } = await supabase.from('telegram_admins').select('*').order('created_at', { ascending: false });
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ admins: admins || [], count: admins?.length ?? 0 }));
                }

                if (req.method === 'POST') {
                  let bodyStr = '';
                  req.on('data', chunk => { bodyStr += chunk; });
                  req.on('end', async () => {
                    try {
                      const { email, telegramUserId, name } = JSON.parse(bodyStr || '{}');
                      const parsedId = parseInt(telegramUserId, 10);
                      if (!parsedId || isNaN(parsedId)) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({ error: 'Please provide a valid numeric Telegram Chat ID.' }));
                      }

                      let resolvedName = (name || '').trim();
                      if (email?.trim()) {
                        const { data: profile } = await supabase.from('profiles').select('full_name, username, email').ilike('email', email.trim()).maybeSingle();
                        if (profile) resolvedName = resolvedName || profile.full_name || `@${profile.username}` || profile.email;
                      }
                      if (!resolvedName) resolvedName = `Admin-${String(parsedId).slice(-4)}`;

                      const { data: newAdmin } = await supabase.from('telegram_admins').insert({
                        telegram_user_id: parsedId,
                        name: resolvedName
                      }).select().maybeSingle();

                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: true, message: `Authorized ${resolvedName} (ID: ${parsedId})`, admin: newAdmin }));
                    } catch (pErr) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ error: pErr?.message || 'Failed to add Telegram admin.' }));
                    }
                  });
                  return;
                }

                if (req.method === 'DELETE') {
                  let bodyStr = '';
                  req.on('data', chunk => { bodyStr += chunk; });
                  req.on('end', async () => {
                    try {
                      const { id } = JSON.parse(bodyStr || '{}');
                      await supabase.from('telegram_admins').delete().eq('id', id);
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: true, message: 'Revoked Telegram admin privileges.' }));
                    } catch (dErr) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ error: dErr?.message || 'Failed to delete Telegram admin.' }));
                    }
                  });
                  return;
                }
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              }
            }

            next();
          });
        }
      }
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('react-markdown') || id.includes('katex') || id.includes('rehype') || id.includes('remark')) return 'markdown-vendor';
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
