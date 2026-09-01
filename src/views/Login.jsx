import React, { useState } from 'react';
import { Mail, Lock, BookOpen, ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login({ navigateTo }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data?.user) {
        // Extract a "name" from the email (e.g. "john.doe" from "john.doe@uni.edu")
        const studentName = data.user.email.split('@')[0];
        
        // Show success notification toast/alert
        setMessage({ type: 'success', text: `Welcome ${studentName}` });
        
        // Delay redirect to allow user to see the message
        setTimeout(() => {
          navigateTo('campusHub');
        }, 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Invalid email or password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col justify-center items-center p-4 relative font-inter">
      
      {/* Back to Landing Page Button */}
      <button 
        onClick={() => navigateTo('landing')}
        className="absolute top-6 left-6 text-gray-500 hover:text-primary-navy flex items-center gap-2 transition font-medium"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-navy p-3 rounded-full text-white">
              <BookOpen size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-navy tracking-tight">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your campus study vault</p>
        </div>

        {/* UI Notification Alert */}
        {message.text && (
          <div className={`p-3 rounded-lg text-sm text-center font-medium transition-all ${
            message.type === 'error' 
              ? 'bg-red-50 text-red-600 border border-red-200' 
              : 'bg-green-50 text-green-600 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Student Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@university.edu"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <a href="#" className="text-xs text-primary-navy hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-primary-navy hover:bg-[#112440] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-primary-navy/30 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <LogIn size={20} />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-sm text-gray-500 text-center mt-6">
          Don't have an account?{' '}
          <button onClick={() => navigateTo('onboarding')} className="text-primary-navy hover:underline font-semibold">
            Get Started
          </button>
        </p>
      </div>
    </div>
  );
}
