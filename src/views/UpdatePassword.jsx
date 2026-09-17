import React, { useState } from 'react';
import { Lock, ArrowLeft, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
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

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully! Redirecting...' });
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col justify-center items-center p-4 relative font-inter">
      <button 
        onClick={() => navigate('/login')}
        className="absolute top-6 left-6 text-gray-500 hover:text-primary-navy flex items-center gap-2 transition font-medium"
      >
        <ArrowLeft size={20} /> Back to Login
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-navy p-3 rounded-full text-white">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-navy tracking-tight">Update Password</h1>
          <p className="text-gray-500">Enter your new password below</p>
        </div>

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
            <label className="block text-sm font-medium text-gray-700">New Password</label>
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

          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-primary-navy hover:bg-[#112440] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-primary-navy/30 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Save size={20} />
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
