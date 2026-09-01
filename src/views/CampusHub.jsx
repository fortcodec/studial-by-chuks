import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, FileText, ChevronRight, BookOpen, Award } from 'lucide-react';
import CCoinBadge from '../components/CCoinBadge';
import { supabase } from '../supabaseClient';
import UnlockMaterialModal from '../components/UnlockMaterialModal';

export default function CampusHub({ navigateTo }) {
  const [vaultItems, setVaultItems] = useState([]);
  const [loadingVault, setLoadingVault] = useState(true);

  // Modal State
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dummy balance and user ID for now
  const dummyBalance = 15;
  const dummyUserId = "12345-mock-id";

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const fetchVaultItems = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVaultItems(data || []);
    } catch (error) {
      console.error('Error fetching vault items:', error);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleMaterialClick = (material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleUnlockSuccess = (materialId) => {
    // Navigate to Reading Room once unlocked
    // In a real app, you would pass the material ID or data to the reading room
    navigateTo('readingRoom');
  };

  const socialPosts = [
    {
      id: 1,
      author: 'Sarah Johnson',
      department: 'Computer Science',
      time: '2h ago',
      content: 'Just uploaded the complete study guide for CSC 305! Check the vault guys, it covers all the new topics Dr. Smith mentioned.',
      likes: 45,
      comments: 12
    },
    {
      id: 2,
      author: 'David Okafor',
      department: 'Engineering',
      time: '5h ago',
      content: 'Does anyone have the past questions for ENG 202 from 2023? I am struggling with the second section.',
      likes: 15,
      comments: 8
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col font-inter">
      {/* Header */}
      <header className="bg-primary-navy text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen size={24} className="text-tertiary-orange" />
            <h1 className="text-xl font-bold">Campus Hub</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigateTo('tasksHub')} className="hover:text-tertiary-orange transition text-sm font-medium flex items-center gap-1">
              <Award size={16} /> Tasks
            </button>
            <button onClick={() => navigateTo('readingRoom')} className="hover:text-tertiary-orange transition text-sm font-medium">
              Reading Room
            </button>
            <button onClick={() => navigateTo('onboarding')} className="hover:text-tertiary-orange transition text-sm font-medium">
              Logout
            </button>
            <CCoinBadge balance={dummyBalance} onClick={() => navigateTo('tasksHub')} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-8">
        
        {/* The Vault (Horizontal Scroll) */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-primary-navy">The Vault</h2>
            <button className="text-secondary-green text-sm font-semibold flex items-center hover:underline">
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {loadingVault ? (
              <div className="text-gray-500 py-4 px-2">Loading materials...</div>
            ) : vaultItems.length === 0 ? (
              <div className="text-gray-500 py-4 px-2">No materials available yet.</div>
            ) : (
              vaultItems.map((item) => {
                const fileType = item.file_url ? item.file_url.split('.').pop().toUpperCase() : 'DOC';
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleMaterialClick(item)}
                    className="flex-none w-64 bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer snap-start relative"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-primary-navy/10 p-2 rounded-lg text-primary-navy">
                        <FileText size={24} />
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {fileType}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.course_code}</p>
                    
                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      {item.cost_coins || 5} C
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Social Feed */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-primary-navy mb-4">Campus Feed</h2>
          
          {/* Create Post */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-tertiary-orange flex items-center justify-center text-white font-bold flex-shrink-0">
              ME
            </div>
            <div className="flex-1">
              <textarea 
                placeholder="Share a resource or ask a question..." 
                className="w-full bg-gray-50 rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary-navy text-sm resize-none"
                rows="2"
              ></textarea>
              <div className="flex justify-end mt-2">
                <button className="bg-primary-navy text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#112440] transition">
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Feed Posts */}
          {socialPosts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-secondary-green flex items-center justify-center text-white font-bold">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{post.author}</h4>
                    <p className="text-xs text-gray-500">{post.department} • {post.time}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {post.content}
              </p>
              
              <div className="flex items-center gap-6 pt-3 border-t border-gray-50">
                <button className="flex items-center gap-1.5 text-gray-500 hover:text-tertiary-orange transition text-sm">
                  <Heart size={18} /> {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-gray-500 hover:text-primary-navy transition text-sm">
                  <MessageCircle size={18} /> {post.comments}
                </button>
                <button className="flex items-center gap-1.5 text-gray-500 hover:text-secondary-green transition text-sm ml-auto">
                  <Share2 size={18} /> Share
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Unlock Modal */}
      <UnlockMaterialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        material={selectedMaterial}
        userCoins={dummyBalance}
        userId={dummyUserId}
        onSuccess={handleUnlockSuccess}
        navigateTo={navigateTo}
      />
    </div>
  );
}
