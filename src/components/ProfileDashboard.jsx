import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Star, 
  Sparkles, 
  Zap, 
  GraduationCap, 
  Coins, 
  Clock, 
  Flame,
  Info
} from 'lucide-react';

/**
 * ProfileDashboard component
 * 
 * Displays user profile details with:
 * 1. Verified Student checkmark badge (Twitter/X style) with 'Verified Student' tooltip.
 * 2. ChatFi reputation_tier badge: glowing gold/yellow gradient for '1-Star Mentor', subtle gray for 'Student'.
 * 3. Pomodoro coin multiplier subtext/tooltip displaying 'Active Pomodoro Multiplier: {coin_multiplier}x'.
 */
export default function ProfileDashboard({ 
  profile = {}, 
  currentUser = {},
  isOwnProfile = true,
  onAvatarClick,
  fileInputRef,
  isUploadingAvatar = false
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMultiplierTooltip, setShowMultiplierTooltip] = useState(false);

  // Normalize profile fields
  const displayName = profile?.full_name || currentUser?.full_name || currentUser?.name || 'Student';
  const username = profile?.username || currentUser?.username || '';
  const email = profile?.email || currentUser?.email || '';
  const department = profile?.department || 'Computer Science';
  const avatarUrl = profile?.avatar_url || currentUser?.avatar_url || currentUser?.avatar || '';
  
  // New Supabase columns
  const isVerified = Boolean(profile?.is_verified ?? currentUser?.is_verified);
  const reputationTier = profile?.reputation_tier || currentUser?.reputation_tier || 'Student';
  const coinMultiplier = profile?.coin_multiplier ?? currentUser?.coin_multiplier ?? 1;
  const coinsBalance = profile?.c_coins ?? currentUser?.c_coins ?? 0;

  const isMentor = reputationTier === '1-Star Mentor' || reputationTier.toLowerCase().includes('mentor');

  return (
    <div className="w-full">
      {/* Profile Header Card */}
      <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/20 flex flex-col items-center text-center shadow-tactile relative overflow-hidden transition-all duration-300">
        {/* Ambient background glow */}
        <div 
          className={`absolute top-0 right-0 w-36 h-36 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none ${
            isMentor ? 'bg-amber-400/20' : 'bg-primary/10'
          }`}
        />

        {/* Avatar Section */}
        <div
          className={`relative mb-3.5 ${isOwnProfile && onAvatarClick ? 'group cursor-pointer' : ''}`}
          onClick={() => isOwnProfile && onAvatarClick && onAvatarClick()}
        >
          {fileInputRef && (
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
            />
          )}

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className={`w-22 h-22 rounded-full object-cover border-4 border-surface shadow-md transition-all duration-200 ${
                isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-85'
              } ${isMentor ? 'ring-2 ring-yellow-400/60' : ''}`}
            />
          ) : (
            <div
              className={`w-22 h-22 rounded-full flex items-center justify-center font-bold border-4 border-surface shadow-md text-2xl transition-all duration-200 ${
                isMentor 
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-black ring-2 ring-yellow-400/60' 
                  : 'bg-indigo-600 text-white'
              } ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-85'}`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Mentor Star indicator on avatar */}
          {isMentor && (
            <div 
              className="absolute -top-1 -right-1 bg-yellow-400 text-black p-1.5 rounded-full shadow-md border-2 border-white dark:border-gray-900"
              title="1-Star Mentor"
            >
              <Star className="w-3.5 h-3.5 fill-black text-black" />
            </div>
          )}
        </div>

        {/* Display Name & Verified Badge */}
        <div className="flex items-center justify-center gap-1.5 mb-1 relative">
          <h2 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight">
            {displayName}
          </h2>

          {/* Verified Student Badge (Twitter/X style) */}
          {isVerified && (
            <div
              className="relative inline-flex items-center"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <span 
                className="cursor-pointer text-sky-500 hover:text-sky-400 transition-transform hover:scale-110 active:scale-95 inline-flex items-center justify-center"
                aria-label="Verified Student"
              >
                {/* Twitter/X style badge */}
                <svg 
                  viewBox="0 0 24 24" 
                  aria-hidden="true" 
                  className="w-5 h-5 fill-current text-sky-500 drop-shadow-sm"
                >
                  <g>
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-3.99s-2.6-1.27-3.99-.81C14.67 2.55 13.43 1.67 12 1.67s-2.67.88-3.34 2.19c-1.39-.46-2.97-.2-3.99.81s-1.27 2.6-.81 3.99C2.55 9.33 1.67 10.57 1.67 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 3.99s2.6 1.27 3.99.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 3.99-.81s1.27-2.6.81-3.99c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.3 11.96l1.41-1.41 2.83 2.83 6.36-6.36 1.41 1.41-7.77 7.77z"></path>
                  </g>
                </svg>
              </span>

              {/* Tooltip: 'Verified Student' */}
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold rounded-md shadow-lg whitespace-nowrap z-30 pointer-events-none animate-in fade-in zoom-in-95">
                  Verified Student
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Username / Handle */}
        <p className="text-[13px] text-outline mb-1.5">
          {username ? `@${username}` : email || 'Campus Member'}
        </p>

        {/* Academic Department Tag */}
        <p className="text-xs font-semibold text-primary/90 bg-primary/10 px-2.5 py-0.5 rounded-md mb-3 inline-flex items-center gap-1 border border-primary/20">
          <GraduationCap className="w-3.5 h-3.5" />
          {department}
        </p>

        {/* Mentor Status Badge (Below academic department tag) */}
        <div className="flex flex-col items-center gap-1.5 mb-4">
          {isMentor ? (
            <div 
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold px-3.5 py-1 rounded-full text-xs inline-flex items-center gap-1.5 shadow-md shadow-yellow-500/25 border border-yellow-300 hover:brightness-105 transition-all cursor-default"
              title={`${reputationTier} - Verified ChatFi Mentor`}
            >
              <Star className="w-3.5 h-3.5 fill-black text-black shrink-0" />
              <span>{reputationTier}</span>
            </div>
          ) : (
            <div 
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-3.5 py-1 rounded-full text-xs inline-flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-default"
              title="Student Tier"
            >
              <GraduationCap className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>{reputationTier}</span>
            </div>
          )}

          {/* Multiplier Display: Subtext & Tooltip under the tier badge */}
          <div 
            className="relative inline-flex items-center justify-center cursor-pointer group"
            onMouseEnter={() => setShowMultiplierTooltip(true)}
            onMouseLeave={() => setShowMultiplierTooltip(false)}
          >
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 py-0.5 px-2 rounded-lg bg-surface-container/60 hover:bg-surface-container transition-colors">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Active Pomodoro Multiplier: <strong className="text-amber-600 dark:text-amber-400">{coinMultiplier}x</strong></span>
            </p>

            {/* Tooltip for Pomodoro Multiplier */}
            {showMultiplierTooltip && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-30 pointer-events-none animate-in fade-in slide-in-from-top-1 border border-white/10">
                <span>Earn {coinMultiplier}x C-Coins while focusing in study rooms</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-4 border-transparent border-b-slate-900/95 dark:border-b-slate-800/95" />
              </div>
            )}
          </div>
        </div>

        {/* C-Coins Pill (Own Profile) */}
        {isOwnProfile && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full shadow-xs">
            <span className="text-amber-500 text-sm">🪙</span>
            <span className="text-[14px] font-bold text-on-surface">
              {Number(coinsBalance).toLocaleString()} C-Coins
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
