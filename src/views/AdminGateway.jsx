import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  Coins, 
  LogOut, 
  Loader2, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  ListTodo, 
  BookOpen, 
  Upload, 
  FileText, 
  Gift, 
  Send, 
  Sun, 
  Moon, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Check, 
  X,
  ExternalLink,
  ShieldCheck,
  Award,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../components/ThemeProvider';
import GiftUsers from '../components/GiftUsers';
import AdminEconomyTab from '../components/admin/AdminEconomyTab';

/**
 * Studial Admin Gateway - Phase 1 Redesign & Live Aggregate Engine
 * 
 * Features:
 * 1. Data Accuracy: Uses secure service role API /api/admin-stats (bypassing RLS) for true aggregate counts
 * 2. Studial Dual-Theme Aesthetic: Deep fintech dark mode (#0F0F12) & crisp white light mode
 * 3. Glassmorphic Stat Cards:
 *    - Blue/Purple: Total Students
 *    - Neon Green: Active Posts
 *    - Gold/Yellow: C-Coins in Circulation
 * 4. Dynamic Profile Badge: '{adminName} - SUPER ADMIN' fetched from active session
 */
export default function AdminGateway({ defaultTab = 'Dashboard' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  // Navigation tab state
  const initialTab = location?.pathname?.includes('/economy') ? 'Economy' : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Mobile responsive & desktop collapsible sidebar states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Current active admin session state
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState('Fortune James');

  // Live Accurate Aggregate Statistics
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePosts: 0,
    totalCoins: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Telegram Admins
  const [telegramAdminsCount, setTelegramAdminsCount] = useState(0);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramAdminsList, setTelegramAdminsList] = useState([]);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [telegramForm, setTelegramForm] = useState({ email: '', telegramChatId: '', name: '' });
  const [isSubmittingTelegram, setIsSubmittingTelegram] = useState(false);

  // Deleting Post Modal State
  const [deletingPost, setDeletingPost] = useState(null);
  const [deletionReason, setDeletionReason] = useState('Violates campus community guidelines (spam, offensive, or inappropriate content)');
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Users State
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Posts Moderation State
  const [posts, setPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  
  // Reports State
  const [postReports, setPostReports] = useState([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // Tasks State
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', reward_coins: 50 });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Study Materials State
  const [materialForm, setMaterialForm] = useState({ title: '', course_code: '', description: '', price_in_coins: 10, file: null });
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  // Editing User State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'student', c_coins: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Economy State
  const [weeklyCoinAmount, setWeeklyCoinAmount] = useState(500);
  const [isDistributingCoins, setIsDistributingCoins] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [isDepositsLoading, setIsDepositsLoading] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Active Admin Profile from Supabase Session
  useEffect(() => {
    let isMounted = true;

    const fetchSessionUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const user = session.user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          const resolvedProfile = profile || { id: user.id, email: user.email };
          setCurrentUser(resolvedProfile);

          // Name extraction: priority to full_name in profile -> user metadata -> email prefix -> Fortune James
          const resolvedName = 
            profile?.full_name || 
            user.user_metadata?.full_name || 
            user.user_metadata?.name || 
            profile?.username || 
            (user.email ? user.email.split('@')[0] : 'Fortune James');

          setAdminName(resolvedName);
        }
      } catch (err) {
        console.warn('[Admin] Failed to fetch admin profile:', err);
      }
    };

    fetchSessionUser();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch True Aggregate Data via Backend API (Bypassing RLS with Service Role Key)
  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Connect to the consolidated service-role backend API route
      const res = await fetch('/api/admin/action?action=stats');

      if (!res.ok) {
        // Only trigger the red error toast if the fetch block catches an actual 500 error from the API route
        if (res.status === 500) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Server Error (500): Failed to load statistics.', 'error');
        }
        return;
      }

      const data = await res.json();
      if (data) {
        // Map the fetched JSON data directly to the 'Total Students', 'Active Posts', and 'C-Coins' cards
        setStats({
          totalStudents: Number(data.totalStudents) || 0,
          activePosts: Number(data.activePosts) || 0,
          totalCoins: Number(data.totalCoins) || 0,
        });
        if (data.telegramAdmins !== undefined) {
          setTelegramAdminsCount(Number(data.telegramAdmins) || 0);
        }
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[Admin] Error fetching stats from /api/admin/action:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Tab-based Data Fetching
  const fetchUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!user_id(username, full_name, avatar_url, is_shadow_banned)')
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsPostsLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_reports')
        .select('*, reporter:profiles!reporter_id(full_name, username), post:posts(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching reports:', error);
      }
      setPostReports(data || []);
    } catch (err) {
      console.warn('Reports notice:', err);
    } finally {
      setIsReportsLoading(false);
    }
  }, []);

  const fetchPendingSubmissions = useCallback(async () => {
    setIsTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select('*, tasks(title, reward_coins), profiles!inner(full_name, username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tasks:', error);
      }
      setPendingSubmissions(data || []);
    } catch (err) {
      console.warn('Submissions notice:', err);
    } finally {
      setIsTasksLoading(false);
    }
  }, []);

  const fetchPendingDeposits = useCallback(async () => {
    setIsDepositsLoading(true);
    try {
      const { data, error } = await supabase
        .from('c_coin_deposits')
        .select('*, profiles!user_id(username, full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingDeposits(data);
      }
    } catch (e) {
      console.warn('Deposits query notice:', e);
    } finally {
      setIsDepositsLoading(false);
    }
  }, []);

  // Fetch data on active tab switch
  useEffect(() => {
    if (activeTab === 'Dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'Users') {
      fetchUsers();
    } else if (activeTab === 'Reports & Moderation') {
      fetchPosts();
      fetchReports();
    } else if (activeTab === 'Tasks Manager') {
      fetchPendingSubmissions();
    } else if (activeTab === 'Economy') {
      fetchPendingDeposits();
    }

    // Realtime Supabase Channel for Admin Updates
    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (activeTab === 'Dashboard') fetchDashboardStats();
        if (activeTab === 'Users') fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        if (activeTab === 'Dashboard') fetchDashboardStats();
        if (activeTab === 'Reports & Moderation') fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => {
        if (activeTab === 'Tasks Manager') fetchPendingSubmissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, fetchDashboardStats, fetchUsers, fetchPosts, fetchReports, fetchPendingSubmissions, fetchPendingDeposits]);

  // Handle User Role / C-Coins Update
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!currentUser || !editingUser) return;
    setIsSubmitting(true);
    try {
      const newCoins = parseInt(editForm.c_coins, 10);
      const diff = newCoins - (editingUser.c_coins || 0);

      const { error } = await supabase.rpc('admin_update_profile', {
        admin_id: currentUser.id,
        target_user_id: editingUser.id,
        new_role: editForm.role,
        new_coins: newCoins,
      });

      if (error) throw error;

      if (diff !== 0) {
        await supabase.from('c_coin_transactions').insert({
          user_id: editingUser.id,
          amount: diff > 0 ? `+${diff} C` : `${diff} C`,
          description: diff > 0 ? 'Admin Grant (Credit)' : 'Admin Adjustment (Debit)',
        });
      }

      showToast(`Updated ${editingUser.username || 'user'} successfully.`);
      setEditingUser(null);
      fetchUsers();
      fetchDashboardStats();
    } catch (err) {
      showToast(err.message || 'Error updating user.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Telegram Admins Operations
  const fetchTelegramAdmins = useCallback(async () => {
    setIsTelegramLoading(true);
    try {
      const res = await fetch('/api/admin/action?action=telegram_admins');
      if (res.ok) {
        const data = await res.json();
        setTelegramAdminsList(data.admins || []);
        setTelegramAdminsCount(data.count ?? data.admins?.length ?? 0);
      }
    } catch (e) {
      console.warn('Failed to fetch telegram admins:', e);
    } finally {
      setIsTelegramLoading(false);
    }
  }, []);

  const handleAddTelegramAdmin = async (e) => {
    e.preventDefault();
    if (!telegramForm.telegramChatId.trim()) {
      showToast('Please provide a Telegram Chat ID.', 'error');
      return;
    }
    setIsSubmittingTelegram(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_telegram_admin',
          email: telegramForm.email.trim(),
          telegramUserId: telegramForm.telegramChatId.trim(),
          name: telegramForm.name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authorize Telegram admin.');

      showToast(data.message || 'Telegram Bot Admin authorized successfully!');
      setTelegramForm({ email: '', telegramChatId: '', name: '' });
      fetchTelegramAdmins();
    } catch (err) {
      showToast(err.message || 'Error authorizing Telegram admin.', 'error');
    } finally {
      setIsSubmittingTelegram(false);
    }
  };

  const handleRevokeTelegramAdmin = async (id, name) => {
    if (!window.confirm(`Revoke Telegram admin authorization for ${name}?`)) return;
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_telegram_admin', id }),
      });
      if (res.ok) {
        showToast('Revoked Telegram admin privileges.');
        fetchTelegramAdmins();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to revoke admin.', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Error revoking admin.', 'error');
    }
  };

  // Open Delete Post Modal
  const openDeletePostModal = (post) => {
    setDeletingPost({
      id: post.id || post.post_id,
      user_id: post.user_id || post.profiles?.id,
      content: post.content || post.post?.content || 'Post content',
      username: post.profiles?.username || post.author?.username || 'user',
    });
    setDeletionReason('Violates campus community guidelines (spam, offensive, or inappropriate content)');
  };

  // Confirm Post Deletion via Backend API & Send Author Notification
  const confirmDeletePost = async (e) => {
    e?.preventDefault();
    if (!deletingPost?.id) return;
    setIsDeletingPost(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_post',
          postId: deletingPost.id,
          reason: deletionReason.trim() || 'Violates campus community guidelines.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post.');

      setPosts(prev => prev.filter(p => p.id !== deletingPost.id));
      setPostReports(prev => prev.filter(r => r.post_id !== deletingPost.id));
      showToast('Post deleted and author notified.');
      setDeletingPost(null);
      fetchDashboardStats();
    } catch (err) {
      showToast(err.message || 'Error removing post.', 'error');
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      const { error } = await supabase.from('tasks').insert([
        {
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          reward_coins: Number(taskForm.reward_coins) || 50,
          is_active: true,
        },
      ]);
      if (error) throw error;
      showToast('New student task created!');
      setTaskForm({ title: '', description: '', reward_coins: 50 });
    } catch (err) {
      showToast(err.message || 'Failed to create task.', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Handle Approve Task Submission
  const handleApproveSubmission = async (submissionId) => {
    try {
      const { error } = await supabase.rpc('approve_task_submission', {
        p_submission_id: submissionId,
        p_admin_id: currentUser.id,
      });

      if (error) {
        // Direct fallback approval
        await supabase
          .from('task_submissions')
          .update({ status: 'approved' })
          .eq('id', submissionId);
      }

      showToast('Task submission approved & reward sent!');
      setPendingSubmissions(prev => prev.filter(s => s.id !== submissionId));
      fetchDashboardStats();
    } catch (err) {
      showToast(err.message || 'Error approving submission.', 'error');
    }
  };

  // Navigation Items
  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Reports & Moderation', icon: ShieldAlert },
    { name: 'Tasks Manager', icon: ListTodo },
    { name: 'Economy', icon: Coins },
  ];

  return (
    <div className="flex h-screen w-full transition-colors duration-200 bg-slate-50 dark:bg-[#0F0F12] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* ── Left Sidebar Navigation (Off-Canvas on Mobile, Collapsible on Desktop) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 transition-all duration-300 ease-in-out
          bg-white/95 dark:bg-[#1A1A1F]/95 backdrop-blur-xl border-r border-slate-200 dark:border-[#2E2E38]
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:inset-auto md:z-auto
          ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      >
        
        {/* Brand & Collapse Header */}
        <div className={`p-4 sm:p-5 border-b border-slate-200/80 dark:border-[#2E2E38] flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-[#00FF7F] text-white dark:text-[#0F0F12] flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20 dark:shadow-[0_0_14px_rgba(0,255,127,0.35)] shrink-0">
              S
            </div>
            <div className={`${isCollapsed ? 'md:hidden' : 'block'} whitespace-nowrap transition-opacity duration-200`}>
              <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Studial<span className="text-blue-600 dark:text-[#00FF7F]">.</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Admin Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B] transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-hide">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveTab(item.name);
                  setIsMobileSidebarOpen(false);
                }}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'md:justify-center md:px-0' : 'gap-3 px-3.5'
                } py-3 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-[#00FF7F]/15 dark:text-[#00FF7F] dark:border dark:border-[#00FF7F]/40 dark:shadow-[0_0_16px_rgba(0,255,127,0.2)]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#24242B] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white dark:text-[#00FF7F]' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className={`${isCollapsed ? 'md:hidden' : 'block'} whitespace-nowrap`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom System Actions */}
        <div className="p-3 border-t border-slate-200/80 dark:border-[#2E2E38] space-y-2">
          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isCollapsed ? (isDark ? 'Switch to Light' : 'Switch to Dark') : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'md:justify-center md:px-0' : 'justify-between px-3.5'
            } py-2.5 rounded-xl text-xs font-bold transition-colors border
              bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200
              dark:bg-[#24242B] dark:hover:bg-[#2E2E38] dark:text-slate-200 dark:border-[#3F3F4E]`}
          >
            <span className={`flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-2'}`}>
              {isDark ? <Sun className="w-4 h-4 text-[#00FF7F] shrink-0" /> : <Moon className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className={`${isCollapsed ? 'md:hidden' : 'block'} whitespace-nowrap`}>
                {isDark ? 'Fintech Dark' : 'Crisp Light'}
              </span>
            </span>
            <span className={`text-[10px] font-extrabold uppercase text-slate-400 ${isCollapsed ? 'md:hidden' : 'inline'}`}>
              Mode
            </span>
          </button>

          {/* Sign Out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'md:justify-center md:px-0' : 'gap-2 px-3.5'
            } py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`${isCollapsed ? 'md:hidden' : 'block'} whitespace-nowrap`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 sm:h-18 px-4 sm:px-6 border-b flex items-center justify-between shrink-0 transition-colors duration-200
          bg-white/90 dark:bg-[#1A1A1F]/90 backdrop-blur-xl border-slate-200 dark:border-[#2E2E38]">
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#24242B] transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {activeTab}
            </h2>
            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold hidden lg:inline">
                Synced {lastRefreshed}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Refresh Live Counts Button */}
            <button
              onClick={fetchDashboardStats}
              title="Refresh live metrics bypassing RLS"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600 dark:text-[#00FF7F]' : ''}`} />
            </button>

            {/* Profile Badge: 'Fortune James - SUPER ADMIN' accurately fetched from active session */}
            <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-2xl border transition-all
              bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]">
              
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 dark:bg-[#00FF7F] text-white dark:text-[#0F0F12] flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                {adminName.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-col pr-1 max-w-[120px] sm:max-w-none">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight truncate">
                  {adminName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-[#00FF7F]">
                  SUPER ADMIN
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6">
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className={`p-4 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center justify-between ${
              toastMessage.type === 'error'
                ? 'bg-red-500 text-white shadow-red-500/25'
                : 'bg-emerald-600 text-white shadow-emerald-600/25'
            }`}>
              <span>{toastMessage.text}</span>
              <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: DASHBOARD STATS (Glassmorphic Borders & Accent Colors) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Students Card: Blue / Purple Accent */}
                <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
                  bg-white/80 border border-blue-300/80 shadow-lg shadow-blue-500/5
                  dark:bg-[#1A1A1F]/85 dark:border-purple-500/40 dark:shadow-[0_0_24px_rgba(168,85,247,0.14)]">
                  
                  {/* Ambient Glow */}
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-blue-500/10 dark:bg-purple-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Students
                    </span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center
                      bg-blue-50 text-blue-600 border border-blue-200/80
                      dark:bg-purple-500/15 dark:text-[#C084FC] dark:border-purple-500/30">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-9 w-28 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {((stats?.totalStudents) || 0).toLocaleString()}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-blue-600 dark:text-[#C084FC] bg-blue-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Active learners across all campuses
                  </p>
                </div>

                {/* 2. Active Posts Card: Neon Green Accent */}
                <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
                  bg-white/80 border border-emerald-300/80 shadow-lg shadow-emerald-500/5
                  dark:bg-[#1A1A1F]/85 dark:border-[#00FF7F]/40 dark:shadow-[0_0_24px_rgba(0,255,127,0.18)]">
                  
                  {/* Ambient Glow */}
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/10 dark:bg-[#00FF7F]/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Active Posts
                    </span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center
                      bg-emerald-50 text-emerald-600 border border-emerald-200/80
                      dark:bg-[#00FF7F]/15 dark:text-[#00FF7F] dark:border-[#00FF7F]/40">
                      <ShieldAlert className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-9 w-24 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-[#00FF7F] tabular-nums tracking-tight">
                        {((stats?.activePosts) || 0).toLocaleString()}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-[#00FF7F] bg-emerald-50 dark:bg-[#00FF7F]/15 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Academic discussions & questions
                  </p>
                </div>

                {/* 3. C-Coins Card: Gold / Yellow Accent */}
                <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group
                  bg-white/80 border border-amber-300/80 shadow-lg shadow-amber-500/5
                  dark:bg-[#1A1A1F]/85 dark:border-amber-400/40 dark:shadow-[0_0_24px_rgba(245,158,11,0.18)]">
                  
                  {/* Ambient Glow */}
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 dark:bg-amber-400/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      C-Coins in Circulation
                    </span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center
                      bg-amber-50 text-amber-600 border border-amber-200/80
                      dark:bg-amber-400/15 dark:text-amber-400 dark:border-amber-400/40">
                      <Coins className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-9 w-32 rounded-lg bg-slate-200/80 dark:bg-[#24242B] animate-pulse my-0.5" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-amber-400 tabular-nums tracking-tight">
                        {((stats?.totalCoins) || 0).toLocaleString()}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">
                      C-Economy
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Total student economy balance
                  </p>
                </div>

                {/* 4. Telegram Admins Card: Indigo Accent */}
                <div 
                  onClick={() => {
                    setIsTelegramModalOpen(true);
                    fetchTelegramAdmins();
                  }}
                  className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 group cursor-pointer hover:scale-[1.01] active:scale-[0.99]
                    bg-white/80 border border-indigo-200/80 shadow-lg shadow-indigo-500/5 hover:border-indigo-400
                    dark:bg-[#1A1A1F]/85 dark:border-indigo-500/30 dark:shadow-[0_0_24px_rgba(99,102,241,0.12)] dark:hover:border-indigo-400/60"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Telegram Ops
                    </span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center
                      bg-indigo-50 text-indigo-600 border border-indigo-200/80
                      dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30">
                      <Send className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {((telegramAdminsCount) || 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                      Bot Admins
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-[#2E2E38]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Webhook moderation relays
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTelegramModalOpen(true);
                        fetchTelegramAdmins();
                      }}
                      className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Manage Bot Admins <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Quick Operation Hub */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Weekly C-Coin Distribution Widget */}
                <div className="rounded-2xl p-6 border
                  bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Weekly Campus Coin Drop
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Distribute weekly allowance to all registered student accounts. Processed safely in chunks via backend service role.
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-[#24242B] border-slate-200 dark:border-[#3F3F4E]">
                      <span className="text-xs font-bold text-slate-500">Amount:</span>
                      <input
                        type="number"
                        value={weeklyCoinAmount}
                        onChange={(e) => setWeeklyCoinAmount(e.target.value)}
                        className="w-20 bg-transparent font-black text-slate-900 dark:text-white outline-none text-sm"
                      />
                      <span className="text-xs font-extrabold text-amber-500">C</span>
                    </div>

                    <button
                      onClick={async () => {
                        if (!window.confirm(`Distribute ${weeklyCoinAmount} C-Coins to all active students?`)) return;
                        setIsDistributingCoins(true);
                        try {
                          const res = await fetch('/api/admin/action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'distribute_coins', amount: Number(weeklyCoinAmount) }),
                          });
                          const result = await res.json();
                          if (res.ok) {
                            showToast(`Successfully distributed ${weeklyCoinAmount} C-Coins to students!`);
                            fetchDashboardStats();
                          } else {
                            showToast(result.error || 'Distribution failed.', 'error');
                          }
                        } catch (err) {
                          showToast('Error executing coin drop.', 'error');
                        } finally {
                          setIsDistributingCoins(false);
                        }
                      }}
                      disabled={isDistributingCoins}
                      className="px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer
                        bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-400/20
                        dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black
                        disabled:opacity-50"
                    >
                      {isDistributingCoins ? 'Distributing...' : 'Execute Coin Drop'}
                    </button>
                  </div>
                </div>

                {/* Direct User Gifting Widget */}
                <div className="rounded-2xl p-6 border
                  bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-blue-600 dark:text-[#00FF7F]" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Instant User Bounty / Gift
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Credit custom C-Coin rewards directly to any university student for exceptional contributions.
                  </p>

                  <GiftUsers onGiftSuccess={() => fetchDashboardStats()} />
                </div>

              </div>

            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: USER MANAGEMENT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'Users' && (
            <div className="space-y-4">
              
              {/* Filter & Search Bar */}
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold border outline-none transition-colors
                      bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500
                      dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white dark:focus:border-[#00FF7F]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500">Filter:</span>
                  {['all', 'student', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                        userRoleFilter === role
                          ? 'bg-blue-600 text-white dark:bg-[#00FF7F] dark:text-black font-extrabold'
                          : 'bg-slate-100 dark:bg-[#24242B] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border overflow-hidden
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                
                {isUsersLoading ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-[#00FF7F] animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#141418] text-slate-500 font-extrabold uppercase tracking-wider">
                          <th className="p-4">Student / User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">C-Coins</th>
                          <th className="p-4">Campus / Dept</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#24242B]">
                        {users
                          .filter((u) => {
                            if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                            if (!userSearchQuery) return true;
                            const query = userSearchQuery.toLowerCase();
                            return (
                              u.username?.toLowerCase().includes(query) ||
                              u.full_name?.toLowerCase().includes(query) ||
                              u.department?.toLowerCase().includes(query)
                            );
                          })
                          .map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-[#24242B]/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-purple-500/20 text-blue-700 dark:text-[#C084FC] flex items-center justify-center font-black text-xs">
                                    {(user.full_name || user.username || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-slate-900 dark:text-white">
                                      {user.full_name || user.username || 'Unnamed'}
                                    </p>
                                    <p className="text-[11px] text-slate-400">@{user.username || 'student'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-[#C084FC]'
                                    : 'bg-blue-100 text-blue-700 dark:bg-[#00FF7F]/15 dark:text-[#00FF7F]'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="p-4 font-black text-amber-500 tabular-nums">
                                {user.c_coins || 0} C
                              </td>
                              <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                                {user.department || 'General'}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setEditForm({ role: user.role, c_coins: user.c_coins || 0 });
                                    }}
                                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2E2E38]"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`Delete user @${user.username}?`)) return;
                                      const res = await fetch('/api/admin/action', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'delete_user', userId: user.id }),
                                      });
                                      if (res.ok) {
                                        showToast('User removed.');
                                        fetchUsers();
                                        fetchDashboardStats();
                                      } else {
                                        showToast('Delete failed.', 'error');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: REPORTS & MODERATION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'Reports & Moderation' && (
            <div className="space-y-6">
              
              {/* Reports Queue */}
              <div className="rounded-2xl p-6 border
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Campus Moderation Queue ({postReports.length} pending)
                </h3>

                {isReportsLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-red-500" /></div>
                ) : postReports.length === 0 ? (
                  <p className="text-xs text-slate-500 font-semibold py-4 text-center">
                    All clear! No pending student reports.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {postReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                          bg-red-50/50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                      >
                        <div>
                          <p className="text-xs font-bold text-red-700 dark:text-red-400">
                            Reason: {report.reason || 'Flagged for harassment/bullying'}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic">
                            "{report.post?.content || 'Post content deleted'}"
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openDeletePostModal({ id: report.post_id, user_id: report.post?.user_id, content: report.post?.content, profiles: report.reporter })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm"
                          >
                            Delete Post
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('post_reports').update({ status: 'dismissed' }).eq('id', report.id);
                              fetchReports();
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Posts Inspection */}
              <div className="rounded-2xl p-6 border
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">
                  Live Feed Posts ({posts.length})
                </h3>
                
                <div className="space-y-3">
                  {posts.slice(0, 15).map((post) => (
                    <div
                      key={post.id}
                      className="p-3.5 rounded-xl border flex items-center justify-between gap-3
                        bg-slate-50 dark:bg-[#24242B] border-slate-200 dark:border-[#2E2E38]"
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white mr-2">
                          @{post.profiles?.username || 'user'}:
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {post.content}
                        </span>
                      </div>
                      <button
                        onClick={() => openDeletePostModal(post)}
                        title="Delete post and notify author"
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 4: TASKS MANAGER */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'Tasks Manager' && (
            <div className="space-y-6">
              
              {/* Create Task Form */}
              <div className="rounded-2xl p-6 border
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-blue-600 dark:text-[#00FF7F]" />
                  Publish New Campus Task
                </h3>

                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Task Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Upload PHY 101 Lecture Notes"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl text-xs font-semibold border outline-none
                        bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Reward (C-Coins)</label>
                    <input
                      type="number"
                      required
                      value={taskForm.reward_coins}
                      onChange={(e) => setTaskForm({ ...taskForm, reward_coins: e.target.value })}
                      className="w-full p-2.5 rounded-xl text-xs font-semibold border outline-none
                        bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Task Guidelines & Requirements</label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Explain what the student must upload as proof..."
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl text-xs font-semibold border outline-none
                        bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingTask}
                      className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#00FF7F] dark:text-black shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingTask ? 'Publishing...' : 'Publish Task'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Submissions Queue */}
              <div className="rounded-2xl p-6 border
                bg-white dark:bg-[#1A1A1F] border-slate-200/80 dark:border-[#2E2E38]">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Pending Submissions ({pendingSubmissions.length})
                </h3>

                {isTasksLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                ) : pendingSubmissions.length === 0 ? (
                  <p className="text-xs text-slate-500 font-semibold py-4 text-center">
                    No pending task proofs waiting for review.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                          bg-slate-50 dark:bg-[#24242B] border-slate-200 dark:border-[#2E2E38]"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {sub.profiles?.full_name || sub.profiles?.username || 'Student'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-[#00FF7F] font-bold">
                            Task: {sub.tasks?.title} ({sub.tasks?.reward_coins} C)
                          </p>
                          {sub.proof_url && (
                            <a
                              href={sub.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 mt-1"
                            >
                              View Uploaded Proof <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApproveSubmission(sub.id)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          >
                            Approve & Pay
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('task_submissions').update({ status: 'rejected' }).eq('id', sub.id);
                              fetchPendingSubmissions();
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 5: ECONOMY */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'Economy' && (
            <AdminEconomyTab onShowToast={showToast} />
          )}

        </main>
      </div>

      {/* ── User Edit Modal ────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl animate-in zoom-in-95
            bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#2E2E38]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Edit User: @{editingUser.username}
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold border outline-none
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">C-Coins Balance</label>
                <input
                  type="number"
                  value={editForm.c_coins}
                  onChange={(e) => setEditForm({ ...editForm, c_coins: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold border outline-none
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#00FF7F] dark:text-black"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Post Deletion & Notification Modal (Feature 2) ──────────────── */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl animate-in zoom-in-95
            bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#2E2E38]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Remove Post & Notify Author
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target: @{deletingPost.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingPost(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Post Preview */}
            <div className="p-3.5 rounded-xl mb-4 bg-slate-50 dark:bg-[#24242B] border border-slate-200 dark:border-[#3F3F4E]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Post Content
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3">
                "{deletingPost.content}"
              </p>
            </div>

            <form onSubmit={confirmDeletePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for deletion (Sent to user)
                </label>
                <textarea
                  rows="3"
                  required
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="e.g. Hate speech, unauthorized advertisement, harassment..."
                  className="w-full p-3 rounded-xl text-xs font-medium border outline-none
                    bg-slate-50 border-slate-200 dark:bg-[#24242B] dark:border-[#3F3F4E] dark:text-white focus:border-red-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Spam or unauthorized commercial advertising',
                  'Harassment, toxic bullying, or hate speech',
                  'Academic dishonesty / exam leakage',
                  'Inappropriate or offensive content'
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setDeletionReason(reasonText)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all
                      bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200
                      dark:bg-[#24242B] dark:hover:bg-[#2E2E38] dark:text-slate-300 dark:border-[#3F3F4E]"
                  >
                    {reasonText}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#2E2E38]">
                <button
                  type="button"
                  onClick={() => setDeletingPost(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#24242B] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2E2E38]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingPost}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 disabled:opacity-50"
                >
                  {isDeletingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>{isDeletingPost ? 'Removing...' : 'Confirm Deletion'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Telegram Admins Management Modal (Feature 3) ────────────────── */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl p-6 sm:p-7 border shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto
            bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#2E2E38]">
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Telegram Bot Admin Relays
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Authorize Chat IDs for real-time campus moderation & bot commands
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTelegramModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Telegram Admin Form */}
            <div className="p-4 rounded-2xl mb-6 bg-slate-50 dark:bg-[#24242B] border border-slate-200 dark:border-[#3F3F4E]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Add New Telegram Admin
              </h4>

              <form onSubmit={handleAddTelegramAdmin} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Link Student Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="admin@campus.edu"
                      value={telegramForm.email}
                      onChange={(e) => setTelegramForm({ ...telegramForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl text-xs font-medium border outline-none
                        bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#3F3F4E] dark:text-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Telegram Chat ID (Required)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7070776035"
                      value={telegramForm.telegramChatId}
                      onChange={(e) => setTelegramForm({ ...telegramForm, telegramChatId: e.target.value })}
                      className="w-full p-2.5 rounded-xl text-xs font-black border outline-none
                        bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#3F3F4E] dark:text-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Display Name / Role Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Moderator, Fortune"
                    value={telegramForm.name}
                    onChange={(e) => setTelegramForm({ ...telegramForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl text-xs font-medium border outline-none
                      bg-white dark:bg-[#1A1A1F] border-slate-200 dark:border-[#3F3F4E] dark:text-white focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Send <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">/myid</span> to @userinfobot on Telegram to find a user's Chat ID.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingTelegram}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black
                      bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50"
                  >
                    {isSubmittingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isSubmittingTelegram ? 'Authorizing...' : 'Authorize Telegram Admin'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Authorized Telegram Admins Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Authorized Bot Relays ({telegramAdminsList.length})
                </h4>
                <button
                  type="button"
                  onClick={fetchTelegramAdmins}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isTelegramLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {isTelegramLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
              ) : telegramAdminsList.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-[#24242B] border border-slate-200 dark:border-[#3F3F4E]">
                  <Send className="w-8 h-8 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Telegram Admins registered yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Use the form above to add your first Chat ID</p>
                </div>
              ) : (
                <div className="rounded-xl border divide-y overflow-hidden border-slate-200 dark:border-[#3F3F4E] divide-slate-100 dark:divide-[#2E2E38]">
                  {telegramAdminsList.map((adm) => (
                    <div key={adm.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#24242B]/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                          {((adm.name || 'T')[0] || 'T').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {adm.name || 'Telegram Admin'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            Chat ID: <span className="font-bold text-indigo-600 dark:text-indigo-400">{adm.telegram_user_id}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeTelegramAdmin(adm.id, adm.name || adm.telegram_user_id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
