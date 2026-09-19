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
    const { submissionId, adminId } = body;
    
    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submission ID' });
    }

    // 1. Fetch Submission and Task Details
    const { data: submission, error: fetchError } = await supabase
      .from('task_submissions')
      .select('*, tasks(title, reward_coins)')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    if (submission.status === 'approved') {
       return res.status(400).json({ error: 'Already approved' });
    }

    const rewardAmount = submission.tasks?.reward_coins || 0;
    const userId = submission.user_id;

    // 2. Update Submission Status
    const { error: updateError } = await supabase
      .from('task_submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // 3. Increment C-Coins
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('c_coins')
      .eq('id', userId)
      .single();
      
    const currentCoins = userProfile?.c_coins || 0;
    const newBalance = currentCoins + rewardAmount;

    await supabase
      .from('profiles')
      .update({ c_coins: newBalance })
      .eq('id', userId);

    // 4. Log Transaction
    await supabase
      .from('c_coin_transactions')
      .insert({
        user_id: userId,
        amount: `+${rewardAmount} C`,
        description: `Task Approved: ${submission.tasks?.title || 'Unknown Task'}`
      });

    // 5. Send Notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `Task Approved! ${rewardAmount} C-Coins`,
        message: `Your proof for "${submission.tasks?.title}" was verified by an admin. You earned ${rewardAmount} C-Coins!`,
        type: 'task_approved',
        read: false
      });

    return res.status(200).json({ status: 'success', message: 'Task approved and reward distributed.' });
  } catch (error) {
    console.error("Approve Task API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
