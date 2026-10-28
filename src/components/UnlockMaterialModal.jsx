import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  Coins, 
  Zap, 
  X, 
  Radio, 
  BookOpen, 
  ArrowRight 
} from 'lucide-react';
import CCoinBadge from './CCoinBadge';

/**
 * UnlockMaterialModal Component
 * 
 * Confirmation Bottom Sheet for unlocking premium study materials:
 * 1. Displays material title, price, and user's current C-Coin balance.
 * 2. Unlocks material via Supabase RPC or direct query (deducts coins, adds to unlocked list, logs in transactions).
 * 3. If balance is insufficient, disables the 'Unlock' button and displays:
 *    'Not enough C-Coins. Head to the Live Room to focus and earn more!' (routes to /live).
 */
export default function UnlockMaterialModal({ 
  isOpen, 
  onClose, 
  material, 
  userCoins = 0, 
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

  // Support both price and price_in_coins schema columns
  const price = material.price !== undefined ? Number(material.price) : (Number(material.price_in_coins) || 0);
  const currentBalance = Number(userCoins) || 0;
  const canAfford = currentBalance >= price;

  const handleUnlock = async () => {
    if (!canAfford) return;
    setUnlocking(true);
    setError(null);

    try {
      // 1. Try Supabase RPC first
      let rpcSucceeded = false;
      try {
        const { error: rpcError } = await supabase.rpc('unlock_material', {
          p_material_id: material.id,
          p_cost: price
        });
        if (!rpcError) {
          rpcSucceeded = true;
        } else {
          console.warn('RPC unlock_material returned error, attempting fallback queries:', rpcError);
        }
      } catch (rpcEx) {
        console.warn('RPC unlock_material exception, falling back to direct queries:', rpcEx);
      }

      // 2. Fallback to direct queries if RPC was unavailable or failed
      if (!rpcSucceeded && userId) {
        // Deduct price from profiles.c_coins
        const newCoins = Math.max(0, currentBalance - price);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ c_coins: newCoins })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Add material to unlocked list
        const { error: insertUnlockedError } = await supabase
          .from('unlocked_materials')
          .upsert(
            { user_id: userId, material_id: material.id },
            { onConflict: 'user_id,material_id', ignoreDuplicates: true }
          );

        if (insertUnlockedError) throw insertUnlockedError;

        // Log transaction in c_coin_transactions
        await supabase.from('c_coin_transactions').insert({
          user_id: userId,
          amount: `-${price} C`,
          description: `Unlocked: ${material.title || 'Study Material'}`
        });

        // Optional notification receipt
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'reward',
          title: 'Material Unlocked',
          content: `You spent ${price} C-Coins to unlock ${material.title}.`
        });
      }

      // 3. Re-fetch user profile to sync C-Coins balance globally
      if (userId && setCurrentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (profileData) {
          setCurrentUser(profileData);
        }
      }

      // 4. Mark success
      if (typeof onSuccess === 'function') {
        onSuccess(material.id);
      }
      setIsSuccess(true);
    } catch (err) {
      console.error('Unlock Material Error:', err);
      setError(err.message || 'Failed to complete unlock transaction. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleHeadToLiveRoom = () => {
    onClose();
    if (typeof navigateTo === 'function') {
      navigateTo('/live');
    }
  };

  // Render the Success State
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative text-center border border-outline-variant/30 animate-in slide-in-from-bottom-full duration-300">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center animate-bounce shadow-inner">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold mb-1.5 text-slate-900 dark:text-white">
            Material Unlocked!
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
            You now have permanent access to <strong className="text-slate-900 dark:text-white">{material.title}</strong>.
          </p>
          <button 
            type="button"
            onClick={() => {
              if (onOpenMaterial) onOpenMaterial();
              else onClose();
            }}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-slate-900 dark:text-white rounded-2xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all text-sm"
          >
            Read Now
          </button>
        </div>
      </div>
    );
  }

  // Slide-up Confirmation Bottom Sheet
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl relative border border-outline-variant/30 animate-in slide-in-from-bottom-full duration-300 z-10">
        
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Unlock Study Material
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock with C-Coins to view full notes & questions.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Material Title Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">
            Document
          </span>
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
            {material.title || 'Untitled Material'}
          </h4>
          {material.course_code && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 inline-block font-medium">
              Course: {material.course_code}
            </span>
          )}
        </div>

        {/* Financial Breakdown (Price & User Balance) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 bg-surface-container-lowest dark:bg-slate-800/60 rounded-2xl border border-outline-variant/30 flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Material Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-base text-amber-600 dark:text-amber-400">
              <span className="text-amber-500">🪙</span>
              <span>{price} C-Coins</span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-lowest dark:bg-slate-800/60 rounded-2xl border border-outline-variant/30 flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Your Balance
            </span>
            <div className="flex items-center gap-1.5 font-black text-base text-slate-900 dark:text-white">
              <span className="text-amber-500">🪙</span>
              <span>{currentBalance} C-Coins</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons & Insufficient Funds State */}
        {canAfford ? (
          <div className="space-y-2.5">
            <button 
              type="button"
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 dark:text-white rounded-2xl font-extrabold transition shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
            >
              {unlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Unlocking Material...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock for {price} C-Coins</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={unlocking}
              className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Insufficient Funds State */
          <div className="space-y-3">
            {/* Disabled Unlock Button */}
            <button
              type="button"
              disabled
              className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-bold cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock for {price} C-Coins (Disabled)</span>
            </button>

            {/* CTA saying: 'Not enough C-Coins. Head to the Live Room to focus and earn more!' */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col gap-2">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 leading-snug">
                Not enough C-Coins. Head to the Live Room to focus and earn more!
              </p>
              <button
                type="button"
                onClick={handleHeadToLiveRoom}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-slate-900 dark:text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>Go to Live Study Room</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
