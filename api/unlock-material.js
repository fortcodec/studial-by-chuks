import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId, materialId, cost } = body;
    
    const materialCost = Number(cost) || 0;
    
    if (!userId || !materialId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Fetch user to verify balance
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('c_coins')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user.c_coins || 0) < materialCost) {
      return res.status(400).json({ error: 'Insufficient C-Coins' });
    }

    // 2. Decrement coins
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ c_coins: user.c_coins - materialCost })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // 3. Insert into unlocked_materials
    const { error: unlockError } = await supabase
      .from('unlocked_materials')
      .insert([{ user_id: userId, material_id: materialId }]);

    if (unlockError) {
      // Revert decrement if insert fails (manual rollback since it's not a true RPC transaction)
      await supabase.from('profiles').update({ c_coins: user.c_coins }).eq('id', userId);
      throw unlockError;
    }

    // 4. Log transaction
    await supabase
      .from('c_coin_transactions')
      .insert({
        user_id: userId,
        amount: `-${materialCost} C`,
        description: `Purchased Study Material`
      });

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error("Unlock Material API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
