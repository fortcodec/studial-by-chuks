import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Settings, Bookmark, Clock, LogOut, ChevronRight, FileText, Brain, GraduationCap, Loader2 } from 'lucide-react';

export default function ProfileView() {
  const { currentUser } = useOutletContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [stats, setStats] = useState({
    posts: 0,
    quizzes: 0,
    studyHours: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          setEmail(user.email);
          
          // Fetch additional profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('department')
            .eq('id', user.id)
            .single();
            
          if (profile && isMounted) setDepartment(profile.department || 'Computer Science');

          // Fetch Posts Count
          const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          // Fetch live transactions
          const { data: transactionData } = await supabase
            .from('c_coin_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (isMounted) {
            setStats({
              posts: postsCount || 0,
              quizzes: 0, // Default to 0
              studyHours: 0 // Default to 0
            });
            
            // Map the DB format to the UI format
            if (transactionData) {
              setTransactions(transactionData.map(tx => ({
                id: tx.id,
                type: tx.description,
                amount: tx.amount,
                date: new Date(tx.created_at).toLocaleDateString()
              })));
            } else {
              setTransactions([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfileData();

    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background pb-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 flex flex-col gap-6 pb-24">
      {/* Header Card */}
      <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/30 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="relative mb-3">
          {currentUser?.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className="w-20 h-20 rounded-full object-cover border-4 border-surface shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold border-4 border-surface shadow-sm text-2xl">
              {(currentUser?.name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1.5 border border-outline-variant/30 shadow-sm cursor-pointer hover:bg-surface-container">
            <Settings className="w-4 h-4 text-outline" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-on-surface mb-1">{currentUser?.name || 'Student'}</h2>
        <p className="text-[13px] text-outline mb-1">{email || 'Loading...'}</p>
        <p className="text-xs font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded mb-4">{department || 'University Student'}</p>

        <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 px-4 py-1.5 rounded-full shadow-sm z-10">
          <span className="text-warning text-sm drop-shadow-sm">🪙</span>
          <span className="text-[14px] font-bold text-on-surface">{currentUser?.c_coins?.toLocaleString() || 0} C-Coins</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-bold text-on-surface leading-none mb-1">{stats.posts}</h4>
            <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">Posts</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-secondary-green/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-secondary-green" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-bold text-on-surface leading-none mb-1">{stats.quizzes}</h4>
            <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">Quizzes</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-tertiary-orange/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-tertiary-orange" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-bold text-on-surface leading-none mb-1">{stats.studyHours}h</h4>
            <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">Studied</span>
          </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div>
        <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          Recent Transactions
        </h3>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-outline text-sm">
              No transactions yet. Complete quizzes or post answers to earn C-Coins!
            </div>
          ) : (
            transactions.map((tx, idx) => (
              <div key={tx.id} className={`flex items-center justify-between p-4 ${idx !== transactions.length - 1 ? 'border-b border-outline-variant/20' : ''}`}>
                <div>
                  <p className="font-semibold text-sm text-on-surface">{tx.type}</p>
                  <p className="text-xs text-outline">{tx.date}</p>
                </div>
                <span className={`font-bold text-sm ${tx.amount.startsWith('+') ? 'text-secondary-green' : 'text-error'}`}>
                  {tx.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Links */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <button className="flex items-center justify-between p-4 bg-transparent hover:bg-surface-container-low transition-colors border-b border-outline-variant/20 group w-full">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-semibold text-on-surface">Edit Profile Info</span>
          </div>
          <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
        </button>

        <button className="flex items-center justify-between p-4 bg-transparent hover:bg-surface-container-low transition-colors group w-full">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-semibold text-on-surface">Saved Study Materials</span>
          </div>
          <ChevronRight className="w-5 h-5 text-outline group-hover:text-indigo-600 transition-colors" />
        </button>
      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="mt-2 flex items-center justify-center gap-2 w-full p-4 bg-error/10 hover:bg-error/20 text-error rounded-2xl font-bold transition-colors active:scale-[0.98]"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </button>
    </div>
  );
}
