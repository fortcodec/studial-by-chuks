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
    const amount = Number(body.amount) || 500;

    // Fetch all students
    const { data: students, error: fetchError } = await supabase
      .from('profiles')
      .select('id, c_coins')
      .eq('role', 'student');

    if (fetchError) throw fetchError;
    if (!students || students.length === 0) {
      return res.status(200).json({ status: 'ok', message: 'No students found.' });
    }

    const customMessage = body.message && body.message.trim() ? body.message.trim() : `You received ${amount} C-Coins for the week from admin! Keep up the great work!`;

    // We process in chunks to avoid overwhelming the Vercel/Supabase limits
    const CHUNK_SIZE = 50;
    
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (student) => {
        const newBalance = (student.c_coins || 0) + amount;
        
        // 1. Update Profile Balance
        await supabase
          .from('profiles')
          .update({ c_coins: newBalance })
          .eq('id', student.id);
          
        // 2. Log Transaction
        await supabase
          .from('c_coin_transactions')
          .insert({
            user_id: student.id,
            amount: `+${amount} C`,
            description: 'Weekly Admin Bonus'
          });
          
        // 3. Create Notification for Popup
        await supabase
          .from('notifications')
          .insert({
            user_id: student.id,
            title: `Weekly Drop: ${amount} C-Coins`,
            message: customMessage,
            type: 'weekly_drop',
            read: false
          });
      }));
    }

    return res.status(200).json({ status: 'success', distributedTo: students.length, amount });
  } catch (error) {
    console.error("Distribute Coins API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
