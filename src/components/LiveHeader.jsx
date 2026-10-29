import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ChevronDown, 
  Sun, 
  Moon, 
  Radio, 
  Sparkles, 
  Users,
  Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTheme } from './ThemeProvider';
import CCoinBadge from './CCoinBadge';
import NotificationDropdown from './NotificationDropdown';
import { Avatar } from './Avatar';
import GlobalSearch from './GlobalSearch';

// Supported Universities / Campuses for Studial Cross-Campus Network
export const CAMPUSES = [
  { id: 'UNIBEN', name: 'Univ. of Benin', short: 'UNIBEN', location: 'Benin City' },
  { id: 'FUL', name: 'Fed. Univ. Lokoja', short: 'FUL', location: 'Lokoja' },
  { id: 'UNILAG', name: 'Univ. of Lagos', short: 'UNILAG', location: 'Akoka, Lagos' },
  { id: 'OAU', name: 'Obafemi Awolowo Univ.', short: 'OAU', location: 'Ile-Ife' },
  { id: 'UNN', name: 'Univ. of Nigeria', short: 'UNN', location: 'Nsukka' },
  { id: 'ABU', name: 'Ahmadu Bello Univ.', short: 'ABU', location: 'Zaria' },
  { id: 'UI', name: 'Univ. of Ibadan', short: 'UI', location: 'Ibadan' },
];

/**
 * LiveHeader Component - 'Campus Pulse'
 * 
 * Features:
 * - Supabase Realtime Presence channel for tracking active concurrent students
 * - Dynamic live indicator pill: Solid blue in light mode, Neon green in dark mode
 * - Dropdown for switching campus contexts (UNIBEN, FUL, etc.)
 * - Guaranteed subscription cleanup on unmount
 * - Seamless dual-theme styling (crisp white / fintech dark)
 */
export default function LiveHeader({
  currentUser,
  onCampusChange,
  onBuyCoins,
}) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // Active campus selection persisted in localStorage
  const [selectedCampus, setSelectedCampus] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studial_selected_campus');
      if (saved && CAMPUSES.some(c => c.id === saved)) return saved;
    }
    return 'UNIBEN';
  });

  const [activeCount, setActiveCount] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Supabase Realtime Presence for Active Campus Pulse
  useEffect(() => {
    let isMounted = true;
    setIsWarmingUp(true);

    // 1. Fetch dynamic baseline from recent profile activities or campus members
    const fetchCampusBaseCount = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('department', `%${selectedCampus}%`);

        if (!error && count !== null && count > 0 && isMounted) {
          // Dynamic baseline scaled to current active presence window
          setActiveCount(Math.max(1, Math.min(count, 45)));
        }
      } catch (err) {
        console.warn('[CampusPulse] Error querying baseline:', err);
      } finally {
        if (isMounted) setIsWarmingUp(false);
      }
    };

    fetchCampusBaseCount();

    // 2. Connect to Supabase Realtime Presence Room
    const channelName = `campus-pulse:${selectedCampus.toLowerCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser?.id || `anon-${Math.random().toString(36).substring(7)}`,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const presenceState = channel.presenceState();
        let totalConnected = 0;
        for (const key in presenceState) {
          totalConnected += presenceState[key]?.length || 0;
        }
        // Guarantee at least current user is active (dynamic metric)
        setActiveCount(Math.max(1, totalConnected));
        setIsWarmingUp(false);
      })
      .on('presence', { event: 'join' }, () => {
        if (!isMounted) return;
        const presenceState = channel.presenceState();
        let total = 0;
        for (const k in presenceState) total += presenceState[k]?.length || 0;
        setActiveCount(Math.max(1, total));
      })
      .on('presence', { event: 'leave' }, () => {
        if (!isMounted) return;
        const presenceState = channel.presenceState();
        let total = 0;
        for (const k in presenceState) total += presenceState[k]?.length || 0;
        setActiveCount(Math.max(1, total));
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && isMounted) {
        try {
          await channel.track({
            userId: currentUser?.id || 'guest',
            userName: currentUser?.name || currentUser?.full_name || 'Student',
            campus: selectedCampus,
            onlineAt: new Date().toISOString(),
          });
        } catch (trackErr) {
          console.warn('[CampusPulse] Failed to track presence:', trackErr);
        }
      }
    });

    // 3. Strict Cleanup to prevent memory leaks and orphaned websocket listeners
    return () => {
      isMounted = false;
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [selectedCampus, currentUser?.id]);

  const handleSelectCampus = (campusId) => {
    setSelectedCampus(campusId);
    setIsDropdownOpen(false);
    try {
      localStorage.setItem('studial_selected_campus', campusId);
      // Dispatch custom event for cross-component sync (e.g. FomoCard)
      window.dispatchEvent(new CustomEvent('studial:campus-changed', { detail: { campus: campusId } }));
    } catch (e) {
      console.warn('Failed to save campus in localStorage', e);
    }
    if (onCampusChange) {
      onCampusChange(campusId);
    }
  };

  const activeCampusObj = CAMPUSES.find(c => c.id === selectedCampus) || CAMPUSES[0];

  return (
    <header className="sticky top-0 z-40 w-full transition-colors duration-200 bg-white/90 dark:bg-[#0F0F12]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#2E2E38] shadow-sm dark:shadow-black/40">
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand & Campus Selector */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Logo Badge */}
            <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-[#00FF7F] text-white dark:text-[#0F0F12] flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20 dark:shadow-[0_0_12px_rgba(0,255,127,0.4)] transition-transform group-hover:scale-105">
              S
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white hidden min-[400px]:inline">
              Studial<span className="text-blue-600 dark:text-[#00FF7F]">.</span>
            </span>
          </div>

          {/* Campus Context Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              aria-label="Select Campus Context"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border
                bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-200
                dark:bg-[#1A1A1F] dark:hover:bg-[#24242B] dark:text-slate-200 dark:border-[#2E2E38]
                active:scale-95 shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-[#00FF7F]" />
              <span className="tracking-wide font-extrabold">{activeCampusObj.short}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150
                bg-white border border-slate-200 text-slate-800
                dark:bg-[#1A1A1F] dark:border-[#2E2E38] dark:text-slate-100">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Switch Campus Hub
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                  {CAMPUSES.map((campus) => {
                    const isSelected = campus.id === selectedCampus;
                    return (
                      <button
                        key={campus.id}
                        onClick={() => handleSelectCampus(campus.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-600 dark:bg-[#00FF7F]/15 dark:text-[#00FF7F]'
                            : 'hover:bg-slate-100 dark:hover:bg-[#24242B] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[13px]">{campus.short}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400">{campus.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-[#00FF7F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Presence Indicator Pill (Solid Blue in Light Mode, Neon Green in Dark Mode) */}
        <div className="flex items-center justify-center">
          <div
            title={`${activeCount} students actively connected in ${activeCampusObj.short}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-tight transition-all duration-300 select-none shadow-sm
              bg-blue-600 text-white shadow-blue-500/25 border border-blue-500
              dark:bg-[#00FF7F]/15 dark:text-[#00FF7F] dark:border-[#00FF7F]/40 dark:shadow-[0_0_12px_rgba(0,255,127,0.3)]"
          >
            {/* Live Pulsing Dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                bg-blue-200 dark:bg-[#00FF7F]" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5
                bg-white dark:bg-[#00FF7F]" />
            </span>
            <span className="tabular-nums font-black">{activeCount}</span>
            <span className="font-semibold text-[11px] opacity-95">studying</span>
          </div>
        </div>

        {/* Right: Actions (Theme Toggle, C-Coins, Notifications, Avatar) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            title={isDark ? 'Switch to Crisp Light Mode' : 'Switch to Fintech Dark Mode'}
            className="p-2 rounded-xl transition-all duration-200 border
              bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200
              dark:bg-[#1A1A1F] dark:hover:bg-[#24242B] dark:text-[#00FF7F] dark:border-[#2E2E38]
              active:scale-90"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#00FF7F] animate-in spin-in-90 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600 animate-in spin-in-90 duration-300" />
            )}
          </button>

          {/* C-Coin Badge */}
          <CCoinBadge
            balance={currentUser?.c_coins || 0}
            onClick={onBuyCoins}
          />

          {/* Notifications */}
          <NotificationDropdown currentUser={currentUser} />

          {/* User Avatar */}
          <Avatar
            url={currentUser?.avatar_url || currentUser?.avatar}
            name={currentUser?.username || currentUser?.name || 'Student'}
            size="sm"
            className="border-2 border-slate-200 dark:border-[#2E2E38] cursor-pointer"
            onClick={() => navigate('/profile')}
          />
        </div>

      </div>
    </header>
  );
}
