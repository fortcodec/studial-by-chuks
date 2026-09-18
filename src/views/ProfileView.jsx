import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Settings, Bookmark, Clock, LogOut, ChevronRight, FileText, Brain, GraduationCap, Loader2, X, Download } from 'lucide-react';
import { PostCard } from '../components/PostCard';

export default function ProfileView() {
  const { currentUser } = useOutletContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({
    posts: 0,
    quizzes: 0,
    studyHours: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [isMyPostsLoading, setIsMyPostsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', department: '', university: '' });
  const [savedMaterials, setSavedMaterials] = useState([]);
  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      alert('Avatar updated successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to update avatar: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
            .select('department, username, university, full_name')
            .eq('id', user.id)
            .single();
            
          if (profile && isMounted) {
            setDepartment(profile.department || 'Computer Science');
            setFullName(profile.full_name || '');
            setUsername(profile.username || '');
            setEditForm({
              username: profile.username || '',
              department: profile.department || '',
              university: profile.university || ''
            });
          }

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

          // Fetch My Posts
          setIsMyPostsLoading(true);
          const { data: postsData } = await supabase
            .from('posts')
            .select('*, profiles!user_id(username, full_name, avatar_url), post_likes(count), post_comments(count)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (isMounted) {
            setStats({
              posts: postsCount || 0,
              quizzes: 0, // Default to 0
              studyHours: 0 // Default to 0
            });
            
            setMyPosts(postsData || []);
            setIsMyPostsLoading(false);
            
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
        
        <div className="relative mb-3 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            className="hidden" 
          />
          {currentUser?.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className={`w-20 h-20 rounded-full object-cover border-4 border-surface shadow-sm transition-opacity ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-80'}`}
            />
          ) : (
            <div className={`w-20 h-20 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold border-4 border-surface shadow-sm text-2xl transition-opacity ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-80'}`}>
              {(fullName || currentUser?.name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
          <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1.5 border border-outline-variant/30 shadow-sm hover:bg-surface-container">
            <Settings className="w-4 h-4 text-outline" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-on-surface mb-1">{fullName || currentUser?.name || 'Student'}</h2>
        <p className="text-[13px] text-outline mb-1">{username ? `@${username}` : (email || 'Loading...')}</p>
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

      {/* My Posts Section */}
      <div>
        <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          My Posts
        </h3>
        {isMyPostsLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : myPosts.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 text-center text-outline text-sm shadow-sm">
            You haven't made any posts yet.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {myPosts.map(post => (
              <div key={post.id} className="rounded-[2.5rem] overflow-hidden shadow-lg border border-outline-variant/30 relative" style={{ height: '70vh' }}>
                {/* Override the h-[85vh] in PostCard with a wrapper */}
                <div className="absolute inset-0 [&>div]:h-full">
                  <PostCard 
                    postId={post.id}
                    type={post.type}
                    options={post.options}
                    author={{
                      name: post.is_anonymous ? 'Anonymous Student' : (post.profiles?.full_name || post.profiles?.username),
                      avatar: post.is_anonymous ? 'https://api.dicebear.com/9.x/glass/svg?seed=Anonymous' : post.profiles?.avatar_url
                    }}
                    authorId={post.user_id}
                    course={post.course_code || 'General'}
                    timeAgo={new Date(post.created_at).toLocaleDateString()}
                    content={post.content}
                    attachmentImage={post.media_url}
                    stats={{ 
                      upvotes: post?.post_likes?.[0]?.count || post?.likes || 0, 
                      answers: post?.post_comments?.[0]?.count || post?.comments || 0 
                    }}
                    currentUser={currentUser}
                    onDelete={(id) => setMyPosts(prev => prev.filter(p => p.id !== id))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center justify-between p-4 bg-transparent hover:bg-surface-container-low transition-colors border-b border-outline-variant/20 group w-full"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[15px] font-semibold text-on-surface">Edit Profile Info</span>
          </div>
          <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
        </button>

        <button 
          onClick={async () => {
            setIsSavedModalOpen(true);
            if (currentUser?.id) {
              const { data } = await supabase
                .from('saved_materials')
                .select(`id, study_materials (*)`)
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
              if (data) setSavedMaterials(data.map(item => item.study_materials));
            }
          }}
          className="flex items-center justify-between p-4 bg-transparent hover:bg-surface-container-low transition-colors group w-full"
        >
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-outline hover:text-on-surface bg-surface-container p-1 rounded-full">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-on-surface mb-4">Edit Profile</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('profiles').update(editForm).eq('id', user.id);
                setDepartment(editForm.department);
                setIsEditModalOpen(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-outline mb-1 uppercase tracking-wider">Username</label>
                <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-on-surface font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-outline mb-1 uppercase tracking-wider">Department</label>
                <input type="text" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-on-surface font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-outline mb-1 uppercase tracking-wider">University</label>
                <input type="text" value={editForm.university} onChange={e => setEditForm({...editForm, university: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-on-surface font-medium" />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary-container hover:text-white text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 mt-2">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Saved Materials Modal */}
      {isSavedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative flex flex-col max-h-[80vh]">
            <button onClick={() => setIsSavedModalOpen(false)} className="absolute top-4 right-4 text-outline hover:text-on-surface bg-surface-container p-1 rounded-full z-10">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-indigo-600" /> Saved Materials
            </h2>
            <div className="overflow-y-auto pr-2 scrollbar-hide flex-1 space-y-3">
              {savedMaterials.length === 0 ? (
                <div className="text-center py-10 text-outline text-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                  No materials saved yet. Browse the Library to save some!
                </div>
              ) : (
                savedMaterials.map(resource => (
                  <div key={resource.id} className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/30 flex items-start gap-3 relative">
                    <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-error" />
                    </div>
                    <div className="flex-grow min-w-0 pr-8">
                      <h4 className="font-bold text-on-surface text-[14px] leading-tight mb-1 truncate">{resource.title}</h4>
                      <span className="bg-primary-container/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {resource.course_code}
                      </span>
                    </div>
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-surface-container flex items-center justify-center rounded-full text-primary hover:bg-primary-container hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
