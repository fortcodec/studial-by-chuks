import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShieldAlert, Coins, TrendingUp, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminGateway({ navigateTo }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigateTo('login');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profile?.role === 'admin') {
        setIsAuthorized(true);
      } else {
        navigateTo('dashboard');
      }
    };
    checkAdmin();
  }, [navigateTo]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Authenticating...</div>;
  }

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Content Moderation', icon: ShieldAlert },
    { name: 'Economy', icon: Coins },
  ];

  const stats = [
    { label: 'Total Students', value: '12,450', change: '+12%', isPositive: true },
    { label: 'Active Live Rooms', value: '84', change: '+5%', isPositive: true },
    { label: 'C-Coins in Circulation', value: '1.2M', change: '-2%', isPositive: false },
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
            onClick={() => navigateTo('login')}
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
            <div className="flex items-center gap-2">
              <img src="https://i.pravatar.cc/150?img=11" alt="Admin" className="w-10 h-10 rounded-full border-2 border-indigo-100" />
              <div className="text-sm">
                <p className="font-bold text-gray-900 leading-tight">Admin User</p>
                <p className="text-gray-500">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Top-Level Statistics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <TrendingUp className="w-16 h-16" />
                </div>
                <h3 className="text-gray-500 font-medium mb-1">{stat.label}</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{stat.value}</span>
                  <span className={`text-sm font-bold flex items-center ${stat.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder for Tab Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{activeTab} Module</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              This module is currently being scaffolded. The data tables and interactive charts will be populated here shortly.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
