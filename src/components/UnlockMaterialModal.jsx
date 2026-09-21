import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import CCoinBadge from './CCoinBadge';

export default function UnlockMaterialModal({ 
  isOpen, 
  onClose, 
  material, 
  userCoins, 
  userId, 
  onSuccess,
  navigateTo,
  setCurrentUser,
  onOpenMaterial
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !material) return null;

  const cost = material.price_in_coins !== undefined ? material.price_in_coins : 5;
  const canAfford = userCoins >= cost;

  const handleUnlock = async () => {
    if (!canAfford) return;
    setUnlocking(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('unlock_material', {
        p_material_id: material.id,
        p_cost: cost
      });

      if (rpcError) {
        throw rpcError;
      }

      // 1. Re-fetch user profile to sync C-Coins balance globally
      if (userId && setCurrentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (!profileError && profileData) {
          setCurrentUser(profileData);
        }
      }

      // 2. Insert automated Inbox Receipt
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'transaction',
          title: 'Material Unlocked',
          content: `You spent ${cost} C-Coins to unlock ${material.title}.`
        });
      }

      // 3. Mark success and trigger animation
      onSuccess(material.id);
      setIsSuccess(true);
    } catch (err) {
      console.error("Supabase RPC Error:", err);
      // Expose the raw error from Supabase
      setError(`Failed: ${err.message || err.details || err.hint || 'Unknown database error'}`);
    } finally {
      setUnlocking(false);
    }
  };

  // Render the Success State
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
        <div className="bg-white dark:bg-surface-container rounded-3xl p-8 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in duration-300 border border-outline-variant/20">
          <div className="mx-auto w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-inner">
            <CheckCircle className="w-12 h-12 text-green-500 drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-extrabold mb-2 text-on-surface">Success!</h3>
          <p className="text-outline mb-8 font-medium text-[15px]">
            You've unlocked <strong className="text-on-surface">{material.title}</strong>.
          </p>
          <button 
            onClick={() => {
              if (onOpenMaterial) onOpenMaterial();
              else onClose();
            }}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/30 active:scale-95 text-[15px]"
          >
            Read Now
          </button>
        </div>
      </div>
    );
  }

  // Render the Default Unlock State
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-white dark:bg-surface-container rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Lock size={32} className="text-amber-500 drop-shadow-sm" />
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-on-surface">Unlock Required</h3>
        <p className="text-outline mb-6 text-sm">
          You need to spend C-Coins to access <strong className="text-on-surface">{material.title}</strong>.
        </p>

        <div className="bg-surface-container-lowest dark:bg-black/20 rounded-2xl p-4 flex justify-between items-center mb-6 border border-outline-variant/30 shadow-inner">
          <span className="text-sm font-semibold text-outline">Required:</span>
          <div className="flex items-center gap-1 font-bold text-lg">
            <CCoinBadge balance={cost} className="shadow-none border-none bg-transparent px-0" />
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-error/10 text-error rounded-xl text-sm flex items-center justify-center gap-2 font-medium">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {canAfford ? (
          <div className="space-y-3">
            <button 
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl font-bold hover:from-amber-600 hover:to-yellow-600 transition shadow-lg shadow-amber-500/30 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {unlocking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Unlocking...
                </>
              ) : `Unlock for ${cost} Coins`}
            </button>
            <button 
              onClick={onClose}
              disabled={unlocking}
              className="w-full py-3 text-outline font-bold hover:bg-surface-container-lowest rounded-2xl transition active:scale-95"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-error text-sm font-bold bg-error/10 p-3 rounded-xl border border-error/20">
              Insufficient Balance! You need {cost - userCoins} more C-Coins to unlock this material.
            </p>
            <button 
              onClick={() => {
                onClose();
                navigateTo('/tasksHub');
              }}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition shadow-lg active:scale-95"
            >
              Earn Coins (Weekly Tasks)
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-outline font-bold hover:bg-surface-container-lowest rounded-2xl transition active:scale-95"
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
