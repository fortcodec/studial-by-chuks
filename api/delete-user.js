import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Service Role Key to bypass RLS and access Admin API
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Allow CORS for local development
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
    const { userId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Delete user from Supabase Auth (This automatically cascades to public.profiles and related tables if FKs are set up correctly)
    const { data, error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Failed to delete user from auth:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error("Delete User API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
