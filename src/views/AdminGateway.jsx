import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShieldAlert, Coins, TrendingUp, LogOut, Loader2, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

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

  // Posts State
  const [posts, setPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  // Editing User State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', c_coins: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const { count: studentsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      
      const { data: coinsData } = await supabase.from('profiles').select('c_coins');
      const totalCoins = coinsData ? coinsData.reduce((sum, p) => sum + (p.c_coins || 0), 0) : 0;

      setStats({
        totalStudents: studentsCount || 0,
        activeLiveRooms: postsCount || 0, // Mocking active live rooms count with total posts for now
        totalCoins: totalCoins
      });
    } catch (error) {
      console.error('Error fetching stats', error);
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) setUsers(data);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchPosts = async () => {
    setIsPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles:user_id (username, full_name, avatar_url)`)
        .order('created_at', { ascending: false });
      if (!error && data) setPosts(data);
    } finally {
      setIsPostsLoading(false);
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
      fetchUsers(); // Refresh
    } catch (err) {
      alert(err.message || 'Error updating user. Did you execute the SQL RPC script?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      alert("Failed to delete post.");
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Content Moderation', icon: ShieldAlert },
    { name: 'Economy', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-inter">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">Studial<span className="text-red-500">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
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

          {activeTab === 'Users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isUsersLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : (
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
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900">{user.full_name || user.username || 'Student'}</p>
                                <p className="text-xs text-gray-500">{user.id.substring(0,8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {user.role || 'student'}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-gray-900">{user.c_coins || 0} C</td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => { setEditingUser(user); setEditForm({ role: user.role || 'student', c_coins: user.c_coins || 0 }); }}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
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
                      {posts.map(post => (
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
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
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

          {activeTab === 'Economy' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Coins className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Economy Module</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Detailed transaction logs and inflation metrics will be built out in the next phase.
              </p>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">C-Coins Balance</label>
                <input 
                  type="number" 
                  value={editForm.c_coins}
                  onChange={(e) => setEditForm({...editForm, c_coins: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
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
    </div>
  );
}
