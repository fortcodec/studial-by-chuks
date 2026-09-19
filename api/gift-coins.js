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
    const { targetUserId, amount, message } = body;
    const giftAmount = Number(amount) || 0;
    
    if (giftAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    
    let studentsToGift = [];
    
    if (targetUserId === 'ALL') {
      // Fetch all students
      const { data: students, error: fetchError } = await supabase
        .from('profiles')
        .select('id, c_coins')
        .eq('role', 'student');

      if (fetchError) throw fetchError;
      studentsToGift = students || [];
    } else {
      // Fetch specific student
      const { data: student, error: fetchError } = await supabase
        .from('profiles')
        .select('id, c_coins')
        .eq('id', targetUserId)
        .single();
        
      if (fetchError) throw fetchError;
      if (student) studentsToGift = [student];
    }

    if (studentsToGift.length === 0) {
      return res.status(200).json({ status: 'ok', message: 'No students found.' });
    }

    const defaultTitle = `Gift: ${giftAmount} C-Coins`;
    const notificationMessage = message && message.trim() ? message.trim() : `You have received a gift of ${giftAmount} C-Coins!`;

    // Process in chunks to avoid overwhelming the Vercel/Supabase limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < studentsToGift.length; i += CHUNK_SIZE) {
      const chunk = studentsToGift.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (student) => {
        const newBalance = (student.c_coins || 0) + giftAmount;
        
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
            amount: `+${giftAmount} C`,
            description: 'Admin Gift'
          });
          
        // 3. Create Notification for Popup
        await supabase
          .from('notifications')
          .insert({
            user_id: student.id,
            title: defaultTitle,
            message: notificationMessage,
            type: 'admin_gift',
            read: false
          });
      }));
    }

    return res.status(200).json({ status: 'success', giftedCount: studentsToGift.length, amount: giftAmount });
  } catch (error) {
    console.error("Gift Coins API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
