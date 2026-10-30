import { supabase } from '../supabaseClient';

/**
 * Robust helper for inserting into c_coin_transactions
 * Ensures payload validation, avoids undefined values, and provides clear diagnostic logging on failure.
 */
export async function logCoinTransaction({ userId, amount, description, transactionType = 'credit' }) {
  if (!userId) {
    console.warn('[c_coin_transactions] Skipped: userId is required but was undefined/null.');
    return { error: 'Missing userId' };
  }

  // Parse amount whether string or number
  let strAmount = String(amount || 0);
  let numAmount = typeof amount === 'number' ? amount : parseInt(strAmount.replace(/[^\d.-]/g, ''), 10) || 0;

  // Derive transaction_type if not explicitly set
  const derivedType = transactionType || (strAmount.startsWith('-') || numAmount < 0 ? 'debit' : 'credit');

  const payload = {
    user_id: userId,
    amount: strAmount,
    description: description || 'Coin Transaction',
    transaction_type: derivedType
  };

  try {
    const { data, error } = await supabase.from('c_coin_transactions').insert(payload);
    if (error) {
      console.error('[c_coin_transactions] Insert Failed (400/Error):', error, 'Payload was:', payload);
      return { error };
    }
    return { data };
  } catch (err) {
    console.error('[c_coin_transactions] Exception during insert:', err, 'Payload was:', payload);
    return { error: err };
  }
}

/**
 * Robust helper for inserting into notifications
 * Ensures payload matches schema (user_id, content/message, title, type, read status)
 */
export async function createNotification({ userId, type = 'system', title = 'Notification', content, message }) {
  if (!userId) {
    console.warn('[notifications] Skipped: userId is required but was undefined/null.');
    return { error: 'Missing userId' };
  }

  const textContent = content || message || '';
  if (!textContent) {
    console.warn('[notifications] Skipped: content/message is required but was empty.');
    return { error: 'Missing content' };
  }

  const payload = {
    user_id: userId,
    type: type,
    title: title,
    content: textContent,
    message: textContent,
    is_read: false,
    read: false
  };

  try {
    const { data, error } = await supabase.from('notifications').insert(payload);
    if (error) {
      // In case table does not have 'message' or 'is_read' column, fallback to standard subset
      console.warn('[notifications] First attempt failed, attempting fallback columns:', error.message);
      const fallbackPayload = {
        user_id: userId,
        type: type,
        title: title,
        content: textContent
      };
      const { data: fbData, error: fbError } = await supabase.from('notifications').insert(fallbackPayload);
      if (fbError) {
        console.error('[notifications] Insert Failed (400/Error):', fbError, 'Payload was:', fallbackPayload);
        return { error: fbError };
      }
      return { data: fbData };
    }
    return { data };
  } catch (err) {
    console.error('[notifications] Exception during notification insert:', err, 'Payload was:', payload);
    return { error: err };
  }
}
