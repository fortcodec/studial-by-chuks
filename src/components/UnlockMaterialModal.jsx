import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, AlertCircle } from 'lucide-react';
import CCoinBadge from './CCoinBadge';

export default function UnlockMaterialModal({ 
  isOpen, 
  onClose, 
  material, 
  userCoins, 
  userId, 
  onSuccess,
  navigateTo 
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !material) return null;

  const cost = material.price_in_coins !== undefined ? material.price_in_coins : 5;
  const canAfford = userCoins >= cost;

  const handleUnlock = async () => {
    if (!canAfford) return;
    setUnlocking(true);
    setError(null);

    try {
      // Deduct coins and record unlock via backend endpoint
      const response = await fetch('/api/unlock-material', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          materialId: material.id,
          cost: cost
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock material');
      }

      onSuccess(material.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to unlock material. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
        
        <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-yellow-600" />
        </div>
        
        <h3 className="text-xl font-bold mb-2">Unlock Required</h3>
        <p className="text-gray-600 mb-6 text-sm">
          You need to spend C Coins to access <strong>{material.title}</strong>.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center mb-6 border border-gray-100">
          <span className="text-sm font-medium text-gray-500">Required:</span>
          <div className="flex items-center gap-1 font-bold text-lg">
            <CCoinBadge balance={cost} className="shadow-none border-none bg-transparent px-0" />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {canAfford ? (
          <div className="space-y-3">
            <button 
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-yellow-600 transition shadow-lg shadow-amber-500/30 active:scale-95 disabled:opacity-70"
            >
              {unlocking ? 'Unlocking...' : `Unlock for ${cost} Coins`}
            </button>
            <button 
              onClick={onClose}
              disabled={unlocking}
              className="w-full py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
              Insufficient Balance! You need {cost - userCoins} more C-Coins to unlock this material.
            </p>
            <button 
              onClick={() => {
                onClose();
                navigateTo('tasksHub');
              }}
              className="w-full py-3 bg-primary-navy text-white rounded-xl font-bold hover:bg-[#112440] transition shadow-lg active:scale-95"
            >
              Earn Coins (Weekly Tasks)
            </button>
            <button 
              onClick={onClose}
              className="w-full py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition"
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
