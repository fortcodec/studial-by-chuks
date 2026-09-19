import React, { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';

export default function GiftUsers({ users, fetchDashboardStats }) {
  const [giftForm, setGiftForm] = useState({ targetUserId: 'ALL', amount: 50, message: '' });
  const [isGifting, setIsGifting] = useState(false);

  const handleGiftUsers = async (e) => {
    e.preventDefault();
    if (giftForm.amount <= 0) return alert("Amount must be greater than 0");
    setIsGifting(true);
    try {
      const response = await fetch('/api/gift-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: giftForm.targetUserId,
          amount: giftForm.amount,
          message: giftForm.message
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to gift coins');
      alert(`Successfully gifted ${giftForm.amount} C-Coins to ${data.giftedCount} user(s)!`);
      setGiftForm({ targetUserId: 'ALL', amount: 50, message: '' });
      if (fetchDashboardStats) fetchDashboardStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGifting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Gift className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Gift Users</h3>
        <p className="text-gray-500">Send C-Coins to individual students or to everyone at once.</p>
      </div>

      <form onSubmit={handleGiftUsers} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Recipient</label>
          <select 
            value={giftForm.targetUserId} 
            onChange={e => setGiftForm({...giftForm, targetUserId: e.target.value})} 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">🌟 All Students (Mass Broadcast)</option>
            {users?.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.email || u.id.substring(0,6)})</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Coin Amount</label>
          <input 
            type="number" 
            required 
            value={giftForm.amount} 
            onChange={e => setGiftForm({...giftForm, amount: e.target.value})} 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" 
            placeholder="e.g. 50" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Message (Optional)</label>
          <textarea 
            rows="2" 
            value={giftForm.message} 
            onChange={e => setGiftForm({...giftForm, message: e.target.value})} 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" 
            placeholder="You got C-Coins from Admin!"
          ></textarea>
        </div>
        
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isGifting} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {isGifting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
            {isGifting ? 'Sending Gift...' : 'Send Gift'}
          </button>
        </div>
      </form>
    </div>
  );
}
