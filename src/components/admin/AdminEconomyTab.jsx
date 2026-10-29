import React, { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  Flame, 
  Wallet, 
  PlusCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function AdminEconomyTab({ onShowToast }) {
  const [stats, setStats] = useState({
    totalCoins: 0,
    totalBurned: 0,
    activeWallets: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'credit' | 'debit'

  // Mint / Airdrop Modal State
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [mintAmount, setMintAmount] = useState(100);
  const [mintReason, setMintReason] = useState('Admin Airdrop');
  const [isSubmittingMint, setIsSubmittingMint] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');

  // 1. Fetch Economy Statistics & Ledger
  const fetchEconomyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/action?action=economy');
      if (!res.ok) {
        if (res.status === 500) {
          const errData = await res.json().catch(() => ({}));
          onShowToast?.(errData.error || 'Server error loading economy data', 'error');
        }
        return;
      }

      const data = await res.json();
      if (data) {
        setStats({
          totalCoins: Number(data?.stats?.totalCoins) || 0,
          totalBurned: Number(data?.stats?.totalBurned) || 0,
          activeWallets: Number(data?.stats?.activeWallets) || 0,
        });
        setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        setUsers(Array.isArray(data?.users) ? data.users : []);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[Admin Economy] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchEconomyData();
  }, [fetchEconomyData]);

  // 2. Handle Mint / Airdrop Submission
  const handleMintSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(mintAmount, 10);
    if (!amountNum || amountNum <= 0) {
      onShowToast?.('Please enter a valid positive coin amount.', 'error');
      return;
    }

    if (!selectedUserId && !customEmail.trim()) {
      onShowToast?.('Please select a student or enter an email address.', 'error');
      return;
    }

    setIsSubmittingMint(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mint_coins',
          userId: selectedUserId || undefined,
          userEmail: !selectedUserId ? customEmail.trim() : undefined,
          amount: amountNum,
          description: mintReason.trim() || 'Admin Mint / Airdrop',
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error || 'Failed to mint coins.');
      }

      onShowToast?.(resData?.message || `Minted ${amountNum} C-Coins successfully!`, 'success');
      setIsMintModalOpen(false);
      setSelectedUserId('');
      setCustomEmail('');
      setMintReason('Admin Airdrop');
      setUserSearchText('');

      // Refresh data to reflect updated balances and ledger
      fetchEconomyData();
    } catch (err) {
      onShowToast?.(err.message || 'Error occurred while minting coins.', 'error');
    } finally {
      setIsSubmittingMint(false);
    }
  };

  // Quick Amount Presets
  const setQuickAmount = (amt) => {
    setMintAmount(amt);
  };

  // Filtered Users for Autocomplete Selection
  const filteredUsers = (users || []).filter((u) => {
    if (!userSearchText.trim()) return true;
    const q = userSearchText.toLowerCase();
    return (
      u?.username?.toLowerCase().includes(q) ||
      u?.full_name?.toLowerCase().includes(q) ||
      u?.email?.toLowerCase().includes(q)
    );
  });

  // Filtered Ledger Transactions
  const filteredTransactions = (transactions || []).filter((tx) => {
    // Type Filter
    const isDebit = tx?.transaction_type === 'debit' || Number(tx?.amount) < 0;
    if (filterType === 'credit' && isDebit) return false;
    if (filterType === 'debit' && !isDebit) return false;

    // Search Query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const userMatch =
      tx?.user?.username?.toLowerCase().includes(q) ||
      tx?.user?.full_name?.toLowerCase().includes(q) ||
      tx?.user?.email?.toLowerCase().includes(q);
    const descMatch = tx?.description?.toLowerCase().includes(q);
    return userMatch || descMatch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION HEADER & PRIMARY ADMIN ACTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl
        bg-white/80 dark:bg-[#1A1A1F]/90 backdrop-blur-xl border border-slate-200/80 dark:border-[#2E2E38] shadow-sm">
        
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Campus Treasury & Economy
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Fintech Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time C-Coin liquidity, burn metrics, and student transaction ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEconomyData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all
              bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200
              dark:bg-[#24242B] dark:hover:bg-[#2E2E38] dark:text-slate-300 dark:border-[#3F3F4E]"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span>{lastRefreshed ? `Refreshed ${lastRefreshed}` : 'Refresh'}</span>
          </button>

          {/* Highly Visible Mint Button */}
          <button
            onClick={() => setIsMintModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]
              bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 border border-amber-300/40"
          >
            <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>Airdrop / Mint Coins</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP STATS ROW: 3 GLASSMORPHIC STAT CARDS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Total C-Coins in Circulation */}
        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
          bg-white/80 border border-amber-300/80 shadow-lg shadow-amber-500/5
          dark:bg-[#1A1A1F]/85 dark:border-amber-500/40 dark:shadow-[0_0_24px_rgba(234,179,8,0.14)]">
          
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total C-Coins in Circulation
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center
              bg-amber-50 text-amber-600 border border-amber-200/80
              dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-10 w-36 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {((stats?.totalCoins) || 0).toLocaleString()} <span className="text-xl font-bold text-amber-500">C</span>
              </span>
            )}
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
              Circulating
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Active balance across all student wallets
          </p>
        </div>

        {/* Card 2: Total Burned (Used for PDFs) */}
        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
          bg-white/80 border border-orange-300/80 shadow-lg shadow-orange-500/5
          dark:bg-[#1A1A1F]/85 dark:border-orange-500/40 dark:shadow-[0_0_24px_rgba(249,115,22,0.14)]">
          
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-orange-500/10 dark:bg-orange-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Burned (Used for PDFs)
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center
              bg-orange-50 text-orange-600 border border-orange-200/80
              dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-10 w-36 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {((stats?.totalBurned) || 0).toLocaleString()} <span className="text-xl font-bold text-orange-500">C</span>
              </span>
            )}
            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800/40">
              Burned
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Materials unlocked & fees absorbed
          </p>
        </div>

        {/* Card 3: Active Wallets */}
        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
          bg-white/80 border border-yellow-300/80 shadow-lg shadow-yellow-500/5
          dark:bg-[#1A1A1F]/85 dark:border-yellow-500/40 dark:shadow-[0_0_24px_rgba(234,179,8,0.14)]">
          
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-yellow-500/10 dark:bg-yellow-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Wallets
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center
              bg-yellow-50 text-yellow-600 border border-yellow-200/80
              dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30">
              <Wallet className="w-5 h-5 text-yellow-500" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-10 w-36 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {((stats?.activeWallets) || 0).toLocaleString()}
              </span>
            )}
            <span className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/60 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-800/40">
              Holders
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Accounts holding active C-Coin balances
          </p>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* THE LEDGER: TRANSACTION TABLE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border overflow-hidden
        bg-white/90 dark:bg-[#1A1A1F]/90 border-slate-200/80 dark:border-[#2E2E38] shadow-sm">
        
        {/* Table Filter & Search Controls */}
        <div className="p-5 border-b flex flex-col sm:flex-row items-center justify-between gap-4 border-slate-200/80 dark:border-[#2E2E38]">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>The Ledger</span>
              <span className="text-xs font-bold text-slate-400">
                ({filteredTransactions?.length ?? 0} {filteredTransactions?.length === 1 ? 'record' : 'records'})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit trail of campus coin movements and unlocks
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium outline-none transition-all
                  bg-slate-50 border border-slate-200 focus:border-amber-400
                  dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white dark:focus:border-amber-400"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-[#24242B] border border-slate-200 dark:border-[#3F3F4E]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-[#1A1A1F] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('credit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'credit'
                    ? 'bg-white dark:bg-[#1A1A1F] text-emerald-600 dark:text-[#00FF7F] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Credits
              </button>
              <button
                onClick={() => setFilterType('debit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'debit'
                    ? 'bg-white dark:bg-[#1A1A1F] text-rose-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Debits
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-slate-50/75 dark:bg-[#24242B]/40 text-slate-400 font-extrabold uppercase tracking-wider border-slate-200/80 dark:border-[#2E2E38]">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Action / Note</th>
                <th className="py-3 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2E2E38]/60">
              {isLoading ? (
                // Skeleton loading rows
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="h-4 w-28 bg-slate-200/80 dark:bg-[#24242B] rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-[#24242B]" />
                        <div className="space-y-1">
                          <div className="h-3.5 w-24 bg-slate-200/80 dark:bg-[#24242B] rounded" />
                          <div className="h-2.5 w-32 bg-slate-200/60 dark:bg-[#24242B]/60 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 w-32 bg-slate-200/80 dark:bg-[#24242B] rounded-full" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-4 w-16 bg-slate-200/80 dark:bg-[#24242B] rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : (!filteredTransactions || filteredTransactions?.length === 0) ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <Coins className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                    <p className="font-bold">No recent transactions</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery || filterType !== 'all' ? 'Try adjusting your search query or filter.' : 'Transactions will appear here as users unlock materials or receive airdrops.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions?.map((tx) => {
                  const numAmt = Number(tx?.amount) || 0;
                  const isDebit = tx?.transaction_type === 'debit' || numAmt < 0;
                  const formattedDate = tx?.created_at
                    ? new Date(tx.created_at).toLocaleString()
                    : 'N/A';

                  return (
                    <tr
                      key={tx?.id || Math.random()}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#24242B]/30 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs
                            bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            {tx?.user?.username?.[0]?.toUpperCase() || tx?.user?.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white block leading-tight">
                              {tx?.user?.full_name || tx?.user?.username || 'Student User'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              @{tx?.user?.username || 'user'} {tx?.user?.email ? `• ${tx.user.email}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isDebit
                              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-[#00FF7F] dark:border-emerald-900/40'
                          }`}>
                            {isDebit ? (
                              <ArrowDownLeft className="w-3 h-3 text-rose-500" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00FF7F]" />
                            )}
                            {tx?.description || (isDebit ? 'Material Unlock' : 'Coin Reward')}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 text-right font-black tabular-nums whitespace-nowrap">
                        <span className={`text-sm ${
                          isDebit 
                            ? 'text-rose-500 dark:text-rose-400' 
                            : 'text-emerald-600 dark:text-[#00FF7F]'
                        }`}>
                          {isDebit ? '-' : '+'}
                          {Math.abs(numAmt || 0).toLocaleString()} C
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* AIRDROP / MINT COINS MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl animate-in zoom-in-95
            bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#2E2E38]">
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Airdrop / Mint C-Coins
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Credit treasury coins directly to a student's account
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMintModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMintSubmit} className="space-y-4">
              
              {/* Select User from Directory */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Target Student / Wallet
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    if (e.target.value) setCustomEmail('');
                  }}
                  className="w-full p-3 rounded-xl text-xs font-semibold border outline-none
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white focus:border-amber-400"
                >
                  <option value="">-- Select from Active Student Directory --</option>
                  {users?.map((u) => (
                    <option key={u?.id} value={u?.id}>
                      {u?.full_name || u?.username} (@{u?.username}) — Balance: {((u?.c_coins) || 0).toLocaleString()} C
                    </option>
                  ))}
                </select>
              </div>

              {/* Or manual email/ID */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Or Enter Specific Email / User ID
                </label>
                <input
                  type="text"
                  placeholder="student@campus.edu or uuid..."
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    if (e.target.value) setSelectedUserId('');
                  }}
                  disabled={!!selectedUserId}
                  className="w-full p-3 rounded-xl text-xs font-medium border outline-none disabled:opacity-50
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white focus:border-amber-400"
                />
              </div>

              {/* Amount & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    C-Coin Amount to Mint
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[50, 100, 250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickAmount(amt)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          mintAmount === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                            : 'bg-slate-100 dark:bg-[#24242B] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#3F3F4E]'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    required
                    className="w-full p-3 pr-10 rounded-xl text-base font-black border outline-none
                      bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white focus:border-amber-400"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-amber-500">
                    C
                  </span>
                </div>
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Action Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hackathon Reward, Top Quiz Performer, Admin Grant..."
                  value={mintReason}
                  onChange={(e) => setMintReason(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs font-medium border outline-none
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white focus:border-amber-400"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#2E2E38]">
                <button
                  type="button"
                  onClick={() => setIsMintModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#24242B] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2E2E38]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMint}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black
                    bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400
                    disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{isSubmittingMint ? 'Minting...' : `Confirm & Mint ${((mintAmount) || 0).toLocaleString()} C`}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
