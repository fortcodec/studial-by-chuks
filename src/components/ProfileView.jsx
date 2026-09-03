import React, { useState, useEffect } from 'react';
import { Camera, Edit2, MapPin, BookOpen, Award, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ProfileView({ user, balance }) {
  // Local state for optimistic updates
  const [localProfile, setLocalProfile] = useState(user || {
    full_name: 'Student',
    username: 'student',
    university: 'Not Specified',
    department: 'Not Specified',
    avatar_url: null,
  });

  // Sync with prop if it changes
  useEffect(() => {
    if (user) {
      setLocalProfile(user);
    }
  }, [user]);

  // Modal states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', username: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const getInitials = (name) => {
    return name && name.trim() !== '' ? name.charAt(0).toUpperCase() : 'U';
  };

  const handleOpenEdit = () => {
    setEditForm({
      full_name: localProfile.full_name || '',
      username: localProfile.username || ''
    });
    setIsEditing(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
      alert("Error: User ID not found.");
      return;
    }
    
    setIsUpdating(true);
    try {
      const updatedName = editForm.full_name;
      const updatedUsername = editForm.username.replace(/\s+/g, '').toLowerCase();

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedName,
          username: updatedUsername
        })
        .eq('id', user.id);

      if (error) {
        alert("Error: " + error.message);
        return;
      }

      // Optimistic UI update
      setLocalProfile(prev => ({
        ...prev,
        full_name: updatedName,
        username: updatedUsername
      }));
      
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert("Error: " + (err.message || "An unexpected error occurred."));
    } finally {
      setIsUpdating(false);
    }
  };

  const displayName = localProfile.full_name || 'Update Your Name';
  const displayUsername = localProfile.username ? `@${localProfile.username}` : '@add_username';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto mt-6 font-inter relative">
      <div className="flex flex-col items-center">
        {/* Avatar UI */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary-navy to-secondary-green flex items-center justify-center text-white text-5xl font-bold shadow-lg">
            {localProfile.avatar_url ? (
              <img src={localProfile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(localProfile.full_name)
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-white p-2.5 rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-primary-navy transition">
            <Camera size={20} />
          </button>
        </div>

        {/* Header Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{displayName}</h2>
          <p className="text-gray-500 font-medium mt-1">{displayUsername}</p>
        </div>

        {/* Details Card */}
        <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8 space-y-5">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-primary-navy">
              <MapPin size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">University</p>
              <p className="font-semibold text-gray-900 text-lg">{localProfile.university || 'Not Specified'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-secondary-green">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Department</p>
              <p className="font-semibold text-gray-900 text-lg">{localProfile.department || 'Not Specified'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-tertiary-orange">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">C-Coins Balance</p>
              <p className="font-semibold text-gray-900 text-lg flex items-center gap-1">
                <span className="text-tertiary-orange">C</span> {balance || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <button 
          onClick={handleOpenEdit}
          className="w-full flex items-center justify-center gap-2 bg-primary-navy hover:bg-[#112440] text-white py-3.5 rounded-xl font-semibold transition-colors shadow-md active:scale-95"
        >
          <Edit2 size={18} />
          Edit Profile
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input 
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  placeholder="e.g. janedoe"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
                  required
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className={`flex-1 bg-primary-navy text-white py-3 rounded-xl font-semibold hover:bg-[#112440] transition active:scale-95 ${isUpdating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
