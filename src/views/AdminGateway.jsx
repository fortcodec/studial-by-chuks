import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShieldAlert, Coins, LogOut, Loader2, Trash2, Edit2, CheckCircle, ListTodo, BookOpen, Upload, FileText, MessageSquare, Gift } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import GiftUsers from '../components/GiftUsers';

export default function AdminGateway() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Stats State
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeLiveRooms: 0,
    totalCoins: 0
  });

  // Users State
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Posts State
  const [posts, setPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [contentSearchQuery, setContentSearchQuery] = useState('');

  // Tasks State
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', reward_coins: 0 });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Study Materials State
  const [materialForm, setMaterialForm] = useState({ title: '', course_code: '', description: '', price_in_coins: 0, file: null });
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  // Editing User State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Messages State
  const [allMessages, setAllMessages] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  // Economy State
  const [weeklyCoinAmount, setWeeklyCoinAmount] = useState(500);
  const [isDistributingCoins, setIsDistributingCoins] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAdminUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile);
      }
    };
    fetchAdminUser();
    
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab === 'Dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'Users') {
      fetchUsers();
    } else if (activeTab === 'Content Moderation') {
      fetchPosts();
    } else if (activeTab === 'Tasks Manager') {
      fetchPendingSubmissions();
    } else if (activeTab === 'Users Chats') {
      fetchAllMessages();
    }
    
    // Set up Realtime subscriptions for Admin Live Data
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (activeTab === 'Dashboard') fetchDashboardStats();
        if (activeTab === 'Users') fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        if (activeTab === 'Dashboard') fetchDashboardStats();
        if (activeTab === 'Content Moderation') fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => {
        if (activeTab === 'Tasks Manager') fetchPendingSubmissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const { count: studentsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      
      const { data: coinsData } = await supabase.from('profiles').select('c_coins').eq('role', 'student');
      const totalCoins = coinsData ? coinsData.reduce((sum, p) => sum + (p.c_coins || 0), 0) : 0;

      setStats({
        totalStudents: studentsCount || 0,
        activeLiveRooms: postsCount || 0,
        totalCoins: totalCoins
      });
    } catch (error) {
      console.error('Error fetching stats', error);
      alert("Failed to load dashboard statistics.");
    }
  };

  const fetchAllMessages = async () => {
    setIsMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender:profiles!sender_id ( username, full_name ),
          receiver:profiles!receiver_id ( username, full_name )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAllMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages', error);
      alert("Failed to load messages.");
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching users:", error);
        alert("Failed to fetch user profiles.");
      } else if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Unexpected error in fetchUsers:", err);
      alert("An unexpected error occurred while fetching users.");
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchPosts = async () => {
    setIsPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles!user_id (username, full_name, avatar_url), post_likes(count), post_comments(count)`)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching posts:", error);
        alert("Failed to fetch posts for moderation.");
      } else if (data) {
        setPosts(data);
      }
    } catch (err) {
      console.error("Unexpected error in fetchPosts:", err);
    } finally {
      setIsPostsLoading(false);
    }
  };

  const fetchPendingSubmissions = async () => {
    setIsTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(`*, tasks(title, reward_coins), profiles!inner(full_name, username)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching tasks:", error);
        // Only show toast if it's a real error, not just 0 rows (though 0 rows usually doesn't throw)
        if (error.code !== 'PGRST116') {
          setToastMessage({ type: 'error', text: 'Failed to fetch pending submissions.' });
          setTimeout(() => setToastMessage(null), 5000);
        }
      } 
      
      // Update state regardless (if data is null, fallback to empty array)
      setPendingSubmissions(data || []);
      
    } catch (err) {
      console.error("Unexpected error in fetchPendingSubmissions:", err);
    } finally {
      setIsTasksLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!currentUser || !editingUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_update_profile', {
        admin_id: currentUser.id,
        target_user_id: editingUser.id,
        new_role: editForm.role,
        new_coins: parseInt(editForm.c_coins, 10)
      });
      if (error) throw error;
      
      alert('User updated successfully!');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error updating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This will remove their profile data.")) return;
    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (!response.ok) {
        setToastMessage({ type: 'error', text: `Failed to delete user: ${result.error || 'Unknown error'}` });
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }

      setToastMessage({ type: 'success', text: 'User deleted successfully.' });
      setTimeout(() => setToastMessage(null), 3000);
      
      // Update local React state instantly
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      // Trigger a re-fetch to ensure sync with the server
      fetchUsers();
    } catch (err) {
      setToastMessage({ type: 'error', text: `Failed to delete user: ${err.message}` });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleDistributeCoins = async () => {
    if (!window.confirm(`Are you sure you want to distribute ${weeklyCoinAmount} C-Coins to all active users? This cannot be undone.`)) return;
    setIsDistributingCoins(true);
    try {
      const response = await fetch('/api/distribute-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: weeklyCoinAmount })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to distribute coins');
      
      setToastMessage({ type: 'success', text: `Successfully distributed ${weeklyCoinAmount} C-Coins to all students!` });
      setWeeklyCoinAmount(''); // Clear the input field after completion
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsDistributingCoins(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    setIsDeletingId(postId);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      
      // Update local React state instantly
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      // Show success toast
      setToastMessage({ type: 'success', text: 'Post deleted successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
      
      // Trigger a re-fetch to ensure sync with the server
      fetchPosts();
    } catch (err) {
      console.error(err);
      setToastMessage({ type: 'error', text: `Failed to delete post: ${err.message || "Unknown error"}` });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      const { data: taskData, error } = await supabase.from('tasks').insert([{
        title: taskForm.title,
        description: taskForm.description,
        reward_coins: parseInt(taskForm.reward_coins, 10)
      }]).select().single();
      
      if (error) throw error;

      // Bulk insert notification for all users
      const { data: allUsers } = await supabase.from('profiles').select('id').eq('role', 'student');
      if (allUsers && allUsers.length > 0) {
        const notifications = allUsers.map(user => ({
          user_id: user.id,
          title: `New Task: ${taskForm.title}`,
          message: `Earn ${taskForm.reward_coins} C-Coins by completing this new task!`,
          type: 'new_task',
          read: false
        }));
        // Supabase allows bulk inserts by passing an array
        await supabase.from('notifications').insert(notifications);
      }

      alert('Task created successfully! Notifications sent to all students.');
      setTaskForm({ title: '', description: '', reward_coins: 0 });
    } catch (err) {
      console.error(err);
      alert("Failed to create task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleApproveSubmission = async (submissionId) => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/approve-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, adminId: currentUser.id })
      });
      
      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error || 'Failed to approve task');
      }

      alert("Submission approved and C-Coins credited!");
      setPendingSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
    } catch (err) {
      alert(err.message || 'Error approving submission.');
    }
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.file) return alert("Please select a file.");
    setIsUploadingMaterial(true);
    try {
      const fileExt = materialForm.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(fileName, materialForm.file);
      
      if (uploadError) throw uploadError;

      const fileUrl = supabase.storage.from('study-materials').getPublicUrl(fileName).data.publicUrl;

      const { error: dbError } = await supabase.from('study_materials').insert([{
        title: materialForm.title,
        course_code: materialForm.course_code,
        description: materialForm.description,
        price_in_coins: parseInt(materialForm.price_in_coins, 10) || 0,
        file_url: fileUrl
      }]);

      if (dbError) throw dbError;

      alert("Study material uploaded successfully!");
      setMaterialForm({ title: '', course_code: '', description: '', price_in_coins: 0, file: null });
    } catch (err) {
      alert("Failed to upload material: " + err.message);
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Tasks Manager', icon: ListTodo },
    { name: 'Study Materials', icon: BookOpen },
    { name: 'Users', icon: Users },
    { name: 'Content Moderation', icon: ShieldAlert },
    { name: 'Users Chats', icon: MessageSquare },
    { name: 'Gift Users', icon: Gift },
    { name: 'Economy', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-inter">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">Studial<span className="text-red-500">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-gray-900">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Admin" className="w-10 h-10 rounded-full border-2 border-indigo-100 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-indigo-100 bg-indigo-500 text-white flex items-center justify-center font-bold">
                  {(currentUser?.full_name || currentUser?.username || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900 leading-none mb-1">{currentUser?.full_name || currentUser?.username || 'Admin User'}</h3>
                <span className="text-xs font-semibold text-secondary-green uppercase tracking-wider">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          {activeTab === 'Dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Users className="w-16 h-16" /></div>
                <h3 className="text-gray-500 font-medium mb-1">Total Students</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.totalStudents}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><ShieldAlert className="w-16 h-16" /></div>
                <h3 className="text-gray-500 font-medium mb-1">Active Posts</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.activeLiveRooms}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Coins className="w-16 h-16" /></div>
                <h3 className="text-gray-500 font-medium mb-1">C-Coins in Circulation</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.totalCoins.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tasks Manager' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><ListTodo className="text-indigo-600" /> Create New Task</h3>
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title</label>
                    <input type="text" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="e.g. Upload Lecture Notes" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reward (C-Coins)</label>
                    <input type="number" required value={taskForm.reward_coins} onChange={e => setTaskForm({...taskForm, reward_coins: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="e.g. 50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea rows="3" required value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="Task details..."></textarea>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" disabled={isCreatingTask} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      {isCreatingTask ? 'Creating...' : 'Create Task'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CheckCircle className="text-green-500" /> Pending Submissions</h3>
                </div>
                {isTasksLoading ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
                  ) : pendingSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-medium">No pending submissions at this time.</div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                          <th className="p-4 font-semibold">Student</th>
                          <th className="p-4 font-semibold">Task</th>
                          <th className="p-4 font-semibold">Proof</th>
                          <th className="p-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingSubmissions.map(sub => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-900">
                              {sub.profiles?.full_name || sub.profiles?.username || 'Unknown'}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900 text-sm">{sub.tasks?.title}</p>
                              <p className="text-xs text-gray-500">Reward: {sub.tasks?.reward_coins} C-Coins</p>
                              {sub.notes && <p className="text-xs text-gray-600 mt-1 italic">Note: "{sub.notes}"</p>}
                            </td>
                            <td className="p-4">
                              <a href={sub.proof_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-semibold flex items-center gap-1">
                                <FileText className="w-4 h-4" /> View Proof
                              </a>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleApproveSubmission(sub.id)} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 text-sm">
                                Approve & Pay
                              </button>
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

          {activeTab === 'Study Materials' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="text-indigo-600" /> Upload Study Material</h3>
              <form onSubmit={handleUploadMaterial} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                    <input type="text" required value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="Calculus Notes" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Course Code</label>
                    <input type="text" required value={materialForm.course_code} onChange={e => setMaterialForm({...materialForm, course_code: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="MTH101" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price in C-Coins (0 for free)</label>
                  <input type="number" min="0" required value={materialForm.price_in_coins} onChange={e => setMaterialForm({...materialForm, price_in_coins: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea rows="2" value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="Brief description..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 relative cursor-pointer">
                    <input type="file" required onChange={e => setMaterialForm({...materialForm, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm font-semibold text-gray-600">{materialForm.file ? materialForm.file.name : 'Click to select a file'}</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isUploadingMaterial || !materialForm.file} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {isUploadingMaterial ? 'Uploading...' : 'Upload Resource'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'Users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isUsersLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : (
                <div className="p-6 pb-0">
                  <input 
                    type="text" 
                    placeholder="Search users by name or email..." 
                    className="mb-4 p-2 border border-gray-300 rounded-lg w-full max-w-sm outline-none focus:border-indigo-500"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>
              )}
              {!isUsersLoading && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                        <th className="p-4 font-semibold">User</th>
                        <th className="p-4 font-semibold">Role</th>
                        <th className="p-4 font-semibold">C-Coins</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users?.filter(user => {
                        if (!userSearchQuery) return true;
                        const q = userSearchQuery.toLowerCase();
                        return (user?.full_name || '').toLowerCase().includes(q) || 
                               (user?.username || '').toLowerCase().includes(q) ||
                               (user?.email || '').toLowerCase().includes(q);
                      }).map(user => (
                        <tr key={user?.id || Math.random()} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {user?.avatar_url ? (
                                <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                  {String(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900">{user?.full_name || user?.username || 'Student'}</p>
                                <p className="text-xs text-gray-500">{user?.id ? String(user.id).substring(0,8) : 'Unknown'}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {user?.role || 'student'}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-gray-900">{user?.c_coins || 0} C</td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => { setEditingUser(user); setEditForm({ role: user?.role || 'student' }); }}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Content Moderation' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isPostsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : (
                <div className="p-6 pb-0">
                  <input 
                    type="text" 
                    placeholder="Search flagged content..." 
                    className="mb-4 p-2 border border-gray-300 rounded-lg w-full max-w-sm outline-none focus:border-indigo-500"
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                  />
                </div>
              )}
              {!isPostsLoading && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                        <th className="p-4 font-semibold">Author</th>
                        <th className="p-4 font-semibold">Snippet</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {posts.filter(post => {
                        if (!contentSearchQuery) return true;
                        const q = contentSearchQuery.toLowerCase();
                        const authorMatch = (post.profiles?.full_name || '').toLowerCase().includes(q) || 
                                            (post.profiles?.username || '').toLowerCase().includes(q);
                        const contentMatch = (post.content || '').toLowerCase().includes(q);
                        return authorMatch || contentMatch;
                      }).map(post => (
                        <tr key={post.id} className="hover:bg-gray-50">
                          <td className="p-4 whitespace-nowrap">
                            <p className="font-bold text-gray-900">{post.profiles?.full_name || post.profiles?.username || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="p-4 max-w-md truncate text-gray-700">
                            {post.content || (post.media_url ? '[Media Attached]' : 'No content')}
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              disabled={isDeletingId === post.id}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isDeletingId === post.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Gift Users' && (
            <GiftUsers users={users} fetchDashboardStats={fetchDashboardStats} />
          )}

          {activeTab === 'Economy' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Coins className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Economy Management</h3>
                <p className="text-gray-500">Trigger weekly distributions or manage the campus economy.</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h4 className="font-bold text-indigo-900 mb-2">Weekly C-Coin Drop</h4>
                <p className="text-sm text-indigo-700 mb-4">
                  Send a batch distribution of C-Coins to all active student profiles. This will automatically notify them and update their balances.
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Coin Amount</label>
                    <input 
                      type="number" 
                      value={weeklyCoinAmount} 
                      onChange={(e) => setWeeklyCoinAmount(Number(e.target.value))} 
                      className="border border-indigo-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 w-32"
                    />
                  </div>
                  <button 
                    onClick={handleDistributeCoins}
                    disabled={isDistributingCoins || weeklyCoinAmount <= 0}
                    className="mt-5 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    {isDistributingCoins ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
                    {isDistributingCoins ? 'Distributing...' : 'Distribute Coins'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Users Chats' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="text-indigo-600" /> Platform Direct Messages (Moderation)
                </h3>
                <button onClick={fetchAllMessages} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Refresh Logs
                </button>
              </div>
              
              {isMessagesLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : allMessages.length === 0 ? (
                <div className="p-12 text-center text-gray-500 font-medium">No messages found on the platform.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                        <th className="p-4 font-semibold">Timestamp</th>
                        <th className="p-4 font-semibold">Sender</th>
                        <th className="p-4 font-semibold">Receiver</th>
                        <th className="p-4 font-semibold">Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allMessages.map(msg => (
                        <tr key={msg.id} className="hover:bg-gray-50">
                          <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(msg.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 font-semibold text-gray-900">
                            {msg.sender?.full_name || msg.sender?.username || msg.sender_id}
                          </td>
                          <td className="p-4 font-semibold text-gray-900">
                            {msg.receiver?.full_name || msg.receiver?.username || msg.receiver_id}
                          </td>
                          <td className="p-4 text-gray-700 text-sm max-w-md truncate" title={msg.content}>
                            {msg.content}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">Edit User Details</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">User Role</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="font-semibold text-sm">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
