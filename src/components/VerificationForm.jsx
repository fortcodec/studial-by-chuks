import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Gift, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * VerificationForm Component
 * 
 * Student Verification & Rewards settings module.
 * Collects Phone Number and Date of Birth with contextual reward helper text.
 * Updates public.profiles with phone_number and dob, and shows a success toast
 * while disabling form fields to prevent spamming.
 */
export default function VerificationForm({ currentUser, onVerified }) {
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch initial profile data (phone_number, dob) for prefilling
  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const activeUserId = currentUser?.id || user?.id;

        if (!activeUserId) {
          if (isMounted) setIsFetching(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('phone_number, dob, is_verified')
          .eq('id', activeUserId)
          .maybeSingle();

        if (error) {
          console.warn('Could not fetch existing profile fields:', error);
        }

        if (profile && isMounted) {
          if (profile.phone_number) setPhone(profile.phone_number);
          if (profile.dob) setDob(profile.dob);
          if (profile.phone_number && profile.dob) {
            // If already filled and verified, can show as saved
            setIsSuccess(true);
          }
        }
      } catch (err) {
        console.error('Error loading verification data:', err);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone.trim()) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    if (!dob) {
      setErrorMessage('Please select your date of birth.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const activeUserId = currentUser?.id || user?.id;

      if (!activeUserId) {
        throw new Error('You must be logged in to verify your profile.');
      }

      // Update current user's row in public.profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: phone.trim(),
          dob: dob,
          is_verified: true,
        })
        .eq('id', activeUserId);

      if (error) throw error;

      // Trigger success state & toast
      setIsSuccess(true);
      setToastMessage('Profile updated!');
      setTimeout(() => setToastMessage(null), 4000);

      if (typeof onVerified === 'function') {
        onVerified({ phone: phone.trim(), dob });
      }
    } catch (err) {
      console.error('Error updating verification fields:', err);
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Card-based Form UI */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-outline-variant/30 dark:border-slate-800 shadow-sm transition-all duration-200">
        <div className="flex items-center gap-3 mb-5 border-b border-outline-variant/20 dark:border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Student Verification & Rewards
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify your student identity to unlock automated coin perks & withdrawals.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isFetching ? (
          <div className="py-8 flex justify-center items-center text-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Number Field */}
            <div>
              <label 
                htmlFor="phone_number" 
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSuccess || isLoading}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border transition-all ${
                    isSuccess
                      ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-outline-variant/30 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-outline-variant/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none'
                  }`}
                  required
                />
              </div>
              {/* Contextual Helper Text */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                <span>Required for account verification and C-Coin withdrawals.</span>
              </p>
            </div>

            {/* Date of Birth Field */}
            <div>
              <label 
                htmlFor="dob" 
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={isSuccess || isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border transition-all ${
                    isSuccess
                      ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-outline-variant/30 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-outline-variant/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none'
                  }`}
                  required
                />
              </div>
              {/* Contextual Helper Text */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                <Gift className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Required to receive your automated Birthday C-Coin Drop.</span>
              </p>
            </div>

            {/* Submit Button & Status */}
            <div className="pt-2">
              {isSuccess ? (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Student Profile Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSuccess(false)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Edit Info
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-slate-900 dark:text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Verification...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save & Verify Profile</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
