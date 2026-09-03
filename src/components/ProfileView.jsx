import React from 'react';
import { Camera, Edit2, MapPin, BookOpen, Award } from 'lucide-react';

export default function ProfileView({ user, balance }) {
  // fallback if user data is missing
  const profile = user || {
    full_name: 'Student',
    username: 'student',
    university: 'Not Specified',
    department: 'Not Specified',
    avatar_url: null,
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto mt-6 font-inter">
      <div className="flex flex-col items-center">
        {/* Avatar UI */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary-navy to-secondary-green flex items-center justify-center text-white text-5xl font-bold shadow-lg">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(profile.full_name)
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-white p-2.5 rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-primary-navy transition">
            <Camera size={20} />
          </button>
        </div>

        {/* Header Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{profile.full_name}</h2>
          <p className="text-gray-500 font-medium mt-1">@{profile.username}</p>
        </div>

        {/* Details Card */}
        <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8 space-y-5">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-primary-navy">
              <MapPin size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">University</p>
              <p className="font-semibold text-gray-900 text-lg">{profile.university}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm text-secondary-green">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Department</p>
              <p className="font-semibold text-gray-900 text-lg">{profile.department}</p>
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
        <button className="w-full flex items-center justify-center gap-2 bg-primary-navy hover:bg-[#112440] text-white py-3.5 rounded-xl font-semibold transition-colors shadow-md active:scale-95">
          <Edit2 size={18} />
          Edit Profile
        </button>
      </div>
    </div>
  );
}
