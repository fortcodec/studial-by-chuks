import React, { useState, useEffect } from 'react';
import { 
  Heart, MessageCircle, Share2, FileText, ChevronRight, BookOpen, 
  Award, Home, User, LogOut, Plus 
} from 'lucide-react';
import CCoinBadge from '../components/CCoinBadge';
import { supabase } from '../supabaseClient';
import UnlockMaterialModal from '../components/UnlockMaterialModal';
import ProfileView from '../components/ProfileView';

export default function CampusHub({ navigateTo }) {
  const [vaultItems, setVaultItems] = useState([]);
  const [loadingVault, setLoadingVault] = useState(true);
  
  // Realtime Feed State
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Modal State
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);

  // Post Submission State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCourseCode, setNewPostCourseCode] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Feed Filter State
  const [feedFilter, setFeedFilter] = useState('global');

  useEffect(() => {
    fetchUser();
    fetchVaultItems();
    fetchPosts();

    // Supabase Realtime Subscription for Posts
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((currentPosts) => [payload.new, ...currentPosts]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoadingUser(false);
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      setCurrentUser(profile);
      setUserBalance(profile.c_coins || 0);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchVaultItems = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setVaultItems(data || []);
    } catch (error) {
      console.error('Error fetching vault items:', error);
    } finally {
      setLoadingVault(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(full_name, username, avatar_url, department)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUser) return;
    
    setIsPosting(true);
    try {
      // 1. Insert post
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([{
          author: currentUser.full_name,
          department: currentUser.department,
          user_id: currentUser.id,
          course_code: newPostCourseCode.trim() || null,
          content: newPostContent.trim(),
          likes: 0,
          comments: 0
        }])
        .select()
        .single();

      if (postError) throw postError;
      
      // 2. Trigger Reward via RPC
      const { error: rpcError } = await supabase.rpc('increment_c_coins', { 
        user_id: currentUser.id, 
        amount: 5 
      });

      if (rpcError) throw rpcError;

      // 3. Update local state
      setNewPostContent('');
      setNewPostCourseCode('');
      setUserBalance((prev) => prev + 5);
      
      // 4. Show Toast Notification
      setToastMessage('Post published! +5 C-Coins earned 🪙');
      setTimeout(() => setToastMessage(null), 3000);
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to publish post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleMaterialClick = (material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleUnlockSuccess = (materialId) => {
    navigateTo('readingRoom');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Top Mobile Header (visible only on small screens) */}
      <header className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-navy">
          <BookOpen size={24} />
          <h1 className="text-xl font-bold">Studial</h1>
        </div>
        <CCoinBadge balance={userBalance} onClick={() => navigateTo('tasksHub')} />
      </header>

      {/* Main 3-Column Layout */}
      <div className="max-w-7xl mx-auto md:grid md:grid-cols-4 lg:grid-cols-5 gap-6 pt-4 md:pt-8 px-4 h-screen overflow-hidden">
        
        {/* LEFT COLUMN: Navigation Sidebar */}
        <aside className="hidden md:flex flex-col col-span-1 border-r border-gray-200 pr-4 sticky top-8 h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-2 text-primary-navy mb-8 px-2">
            <BookOpen size={28} />
            <h1 className="text-2xl font-bold tracking-tight">Studial</h1>
          </div>

          <nav className="flex-1 space-y-2">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'home' ? 'bg-gray-100 text-primary-navy' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Home size={22} /> Home
            </button>
            <button onClick={() => navigateTo('studyRoom')} className="w-full flex items-center gap-4 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">
              <BookOpen size={22} /> Study Room
            </button>
            <button className="w-full flex items-center gap-4 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">
              <FileText size={22} /> The Vault
            </button>
            <button onClick={() => navigateTo('tasksHub')} className="w-full flex items-center gap-4 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">
              <Award size={22} /> Tasks
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'profile' ? 'bg-gray-100 text-primary-navy' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <User size={22} /> Profile
            </button>
          </nav>

          <button onClick={() => navigateTo('onboarding')} className="flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition mt-auto mb-4">
            <LogOut size={22} /> Logout
          </button>
        </aside>

        {/* MIDDLE COLUMN: Main Feed */}
        <main className="col-span-1 md:col-span-2 lg:col-span-3 overflow-y-auto h-[calc(100vh-2rem)] hide-scrollbar pb-20 md:pb-8">
          {activeTab === 'profile' ? (
            loadingUser ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-navy"></div>
              </div>
            ) : (
              <ProfileView user={currentUser} balance={userBalance} />
            )
          ) : (
            <>
              {/* Stories UI */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex overflow-x-auto gap-4 hide-scrollbar">
            {/* Add Story */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-primary-navy transition relative">
                <Plus size={24} />
              </div>
              <span className="text-xs font-medium text-gray-600">Add Story</span>
            </div>
            {/* Placeholders */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-primary-navy p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-200"></div>
                </div>
                <span className="text-xs font-medium text-gray-600">User {i}</span>
              </div>
            ))}
          </div>

          {/* The Feed Toggle */}
          <div className="flex gap-2 mb-4 bg-gray-200/50 p-1 rounded-xl w-max">
            <button 
              onClick={() => setFeedFilter('global')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${feedFilter === 'global' ? 'bg-white text-primary-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Global Campus
            </button>
            <button 
              onClick={() => setFeedFilter('department')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${feedFilter === 'department' ? 'bg-white text-primary-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              My Department
            </button>
          </div>

          {/* Create Post Input */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-start mb-6 relative">
            {toastMessage && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg shadow-md animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-50">
                {toastMessage}
              </div>
            )}
            <div className="w-10 h-10 rounded-full bg-tertiary-orange flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {currentUser?.avatar_url ? (
                 <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                 currentUser?.full_name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1">
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share a resource or ask a question..." 
                className="w-full bg-gray-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary-navy text-sm resize-none"
                rows="2"
                disabled={isPosting}
              ></textarea>
              <div className="flex justify-between items-center mt-2">
                <input 
                  type="text"
                  value={newPostCourseCode}
                  onChange={(e) => setNewPostCourseCode(e.target.value)}
                  placeholder="Course Code (e.g., CSC 201)"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary-navy focus:ring-1 focus:ring-primary-navy w-48"
                  disabled={isPosting}
                />
                <button 
                  onClick={handleCreatePost}
                  disabled={isPosting || !newPostContent.trim()}
                  className={`bg-primary-navy text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#112440] transition ${isPosting || !newPostContent.trim() ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Feed Posts */}
          <div className="space-y-6">
            {loadingPosts ? (
              <div className="text-center text-gray-500 py-8">Loading feed...</div>
            ) : posts.filter(post => feedFilter === 'global' || post.profiles?.department === currentUser?.department).length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <MessageCircle size={24} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-500 text-sm">Be the first to share a resource for this view!</p>
              </div>
            ) : (
              posts
                .filter(post => feedFilter === 'global' || post.profiles?.department === currentUser?.department)
                .map((post) => (
                <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-secondary-green flex items-center justify-center text-white font-bold overflow-hidden">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          post.profiles?.full_name ? post.profiles.full_name.charAt(0).toUpperCase() : (post.author ? post.author.charAt(0).toUpperCase() : 'U')
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{post.profiles?.full_name || post.author || 'Anonymous Student'}</h4>
                          {post.course_code && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {post.course_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{post.profiles?.department || post.department || 'General'} • {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 text-sm mb-4 leading-relaxed">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-50">
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-tertiary-orange transition text-sm font-medium">
                      <Heart size={18} /> {post.likes || 0}
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-primary-navy transition text-sm font-medium">
                      <MessageCircle size={18} /> {post.comments || 0}
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-secondary-green transition text-sm font-medium ml-auto">
                      <Share2 size={18} /> Share
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
            </>
          )}
        </main>

        {/* RIGHT COLUMN: Sticky Right Panel */}
        <aside className="hidden lg:flex flex-col col-span-1 sticky top-8 h-[calc(100vh-4rem)]">
          {/* C-Coins Display */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center cursor-pointer hover:shadow-md transition" onClick={() => navigateTo('tasksHub')}>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Your Balance</p>
              <p className="text-xl font-black text-gray-900 flex items-center gap-1">
                <span className="text-tertiary-orange">C</span> {userBalance}
              </p>
            </div>
            <div className="bg-yellow-50 p-2 rounded-full">
              <Award className="text-tertiary-orange" size={24} />
            </div>
          </div>

          {/* The Vault Sidebar Snippet */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-primary-navy" /> The Vault
              </h2>
              <button className="text-secondary-green text-xs font-bold hover:underline">
                View All
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-2">
              {loadingVault ? (
                <div className="text-gray-500 text-sm py-4">Loading...</div>
              ) : vaultItems.length === 0 ? (
                <div className="text-gray-500 text-sm py-4">No materials yet.</div>
              ) : (
                vaultItems.map((item) => {
                  const fileType = item.file_url ? item.file_url.split('.').pop().toUpperCase() : 'DOC';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleMaterialClick(item)}
                      className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition cursor-pointer flex gap-3 items-center"
                    >
                      <div className="bg-primary-navy/10 p-2 rounded-lg text-primary-navy flex-shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-xs truncate mb-0.5">{item.title}</h3>
                        <p className="text-[10px] text-gray-500 truncate">{item.course_code}</p>
                      </div>
                      <div className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                        {item.cost_coins || 5} C
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Unlock Modal */}
      <UnlockMaterialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        material={selectedMaterial}
        userCoins={userBalance}
        userId={currentUser?.id}
        onSuccess={handleUnlockSuccess}
        navigateTo={navigateTo}
      />
    </div>
  );
}
