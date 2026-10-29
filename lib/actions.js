'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * Server Actions for Studial Database Mutations
 * Securely uses Supabase Service Role Key to bypass RLS for administrative operations.
 */

function getAdminSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role credentials on server.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Server Action: Delete Post & Notify Author
 */
export async function deletePostAction({ postId, reason }) {
  try {
    if (!postId) {
      return { success: false, error: 'Missing postId parameter.' };
    }

    const supabase = getAdminSupabase();
    const removalReason = (reason || '').trim() || 'Violates campus community guidelines.';

    // 1. Fetch post to identify author
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, content')
      .eq('id', postId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!post) {
      return { success: false, error: 'Post not found or already deleted.' };
    }

    // 2. Cascade delete associated reports
    try {
      await supabase.from('post_reports').delete().eq('post_id', postId);
    } catch (_) {}

    // 3. Delete the post from posts table
    const { error: delErr } = await supabase.from('posts').delete().eq('id', postId);
    if (delErr) throw delErr;

    // 4. Insert in-app notification targeting the author
    if (post.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: 'Post Removed by Moderator',
          message: `Your post was removed by a moderator. Reason: ${removalReason}`,
          type: 'moderation',
          read: false
        });
      } catch (notifErr) {
        console.warn('[Server Action] Failed to insert moderation notification:', notifErr);
      }
    }

    return {
      success: true,
      message: 'Post was removed and author notified.',
      postId
    };
  } catch (err) {
    console.error('[Server Action: deletePostAction Error]', err);
    return { success: false, error: err?.message || 'Failed to delete post.' };
  }
}

/**
 * Server Action: Mint / Airdrop C-Coins
 */
export async function mintCoinsAction({ userId, userEmail, amount, description }) {
  try {
    const mintAmount = parseInt(amount, 10);
    if (!mintAmount || mintAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive number for coin minting.' };
    }

    const supabase = getAdminSupabase();
    let targetProfile = null;

    if (userId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      targetProfile = data;
    }

    if (!targetProfile && userEmail?.trim()) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', userEmail.trim())
        .maybeSingle();
      targetProfile = data;
    }

    if (!targetProfile) {
      return { success: false, error: 'Recipient student profile could not be found.' };
    }

    const currentBalance = Number(targetProfile.c_coins) || 0;
    const newBalance = currentBalance + mintAmount;
    const actionDesc = description?.trim() || 'Admin C-Coin Grant';

    // 1. Update recipient balance
    const { error: uErr } = await supabase
      .from('profiles')
      .update({ c_coins: newBalance })
      .eq('id', targetProfile.id);

    if (uErr) throw uErr;

    // 2. Log transaction
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

    // 3. Notify student
    try {
      await supabase.from('notifications').insert({
        user_id: targetProfile.id,
        type: 'reward',
        title: 'C-Coins Airdropped! 🎉',
        content: `You received +${mintAmount} C-Coins from campus administration (${actionDesc}).`
      });
    } catch (_) {}

    return {
      success: true,
      message: `Successfully minted ${mintAmount} C-Coins to @${targetProfile.username || targetProfile.full_name}.`,
      user: {
        id: targetProfile.id,
        username: targetProfile.username,
        full_name: targetProfile.full_name,
        c_coins: newBalance
      },
      transaction: newTx
    };
  } catch (err) {
    console.error('[Server Action: mintCoinsAction Error]', err);
    return { success: false, error: err?.message || 'Failed to mint coins.' };
  }
}

/**
 * Server Action: Distribute Weekly Drop
 */
export async function distributeCoinsAction({ amount = 500, message }) {
  try {
    const giftAmount = Number(amount) || 500;
    const supabase = getAdminSupabase();

    const { data: students, error: fetchError } = await supabase
      .from('profiles')
      .select('id, c_coins')
      .eq('role', 'student');

    if (fetchError) throw fetchError;
    if (!students || students.length === 0) {
      return { success: true, message: 'No students found to distribute to.' };
    }

    const customMessage = message && message.trim()
      ? message.trim()
      : `You received ${giftAmount} C-Coins for the week from admin! Keep up the great work!`;

    const CHUNK_SIZE = 50;
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (student) => {
          const newBalance = (student.c_coins || 0) + giftAmount;
          await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', student.id);
          await supabase.from('c_coin_transactions').insert({
            user_id: student.id,
            amount: `+${giftAmount} C`,
            description: 'Weekly Drop / Reward'
          });
          await supabase.from('notifications').insert({
            user_id: student.id,
            title: `Weekly Drop: ${giftAmount} C-Coins`,
            message: customMessage,
            type: 'weekly_drop',
            read: false
          });
        })
      );
    }

    return { success: true, distributedTo: students.length, amount: giftAmount };
  } catch (err) {
    console.error('[Server Action: distributeCoinsAction Error]', err);
    return { success: false, error: err?.message || 'Failed to distribute coins.' };
  }
}

/**
 * Server Action: Add Telegram Bot Admin
 */
export async function addTelegramAdminAction({ telegramUserId, email, name }) {
  try {
    const parsedId = parseInt(telegramUserId, 10);
    if (!parsedId || isNaN(parsedId)) {
      return { success: false, error: 'Please provide a valid numeric Telegram Chat ID.' };
    }

    const supabase = getAdminSupabase();
    let resolvedName = (name || '').trim();

    if (email?.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, email')
        .ilike('email', email.trim())
        .maybeSingle();

      if (profile) {
        resolvedName = resolvedName || profile.full_name || `@${profile.username}` || profile.email;
      }
    }

    if (!resolvedName) resolvedName = `Admin-${String(parsedId).slice(-4)}`;

    const { data: newAdmin, error } = await supabase
      .from('telegram_admins')
      .insert({
        telegram_user_id: parsedId,
        name: resolvedName
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    return {
      success: true,
      message: `Authorized ${resolvedName} (ID: ${parsedId})`,
      admin: newAdmin
    };
  } catch (err) {
    console.error('[Server Action: addTelegramAdminAction Error]', err);
    return { success: false, error: err?.message || 'Failed to authorize Telegram admin.' };
  }
}

/**
 * Server Action: Revoke Telegram Bot Admin
 */
export async function revokeTelegramAdminAction({ id }) {
  try {
    if (!id) return { success: false, error: 'Missing admin ID' };
    const supabase = getAdminSupabase();

    const { error } = await supabase.from('telegram_admins').delete().eq('id', id);
    if (error) throw error;

    return { success: true, message: 'Revoked Telegram admin privileges.' };
  } catch (err) {
    console.error('[Server Action: revokeTelegramAdminAction Error]', err);
    return { success: false, error: err?.message || 'Failed to revoke Telegram admin.' };
  }
}

/**
 * Server Action: Delete User Auth Profile
 */
export async function deleteUserAction({ userId }) {
  try {
    if (!userId) return { success: false, error: 'Missing userId parameter.' };
    const supabase = getAdminSupabase();

    const { data, error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error('[Server Action: deleteUserAction Error]', err);
    return { success: false, error: err?.message || 'Failed to delete user.' };
  }
}
