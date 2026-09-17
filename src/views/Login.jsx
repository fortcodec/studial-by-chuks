import React, { useState } from 'react';
import { Mail, Lock, BookOpen, ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.identifier, {
        redirectTo: window.location.origin + '/update-password'
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset link sent! Please check your email.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reset link.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const isPhone = formData.identifier.startsWith('+') && /\d/.test(formData.identifier);
      
      let authResponse;
      if (isPhone) {
        const phoneValue = formData.identifier.replace(/[\s-]/g, '');
        authResponse = await supabase.auth.signInWithPassword({
          phone: phoneValue,
          password: formData.password,
        });
      } else {
        authResponse = await supabase.auth.signInWithPassword({
          email: formData.identifier,
          password: formData.password,
        });
      }

      const { data, error } = authResponse;

      if (error) throw error;

      if (data?.user) {
        const studentName = data.user.email ? data.user.email.split('@')[0] : data.user.phone;
        setMessage({ type: 'success', text: `Welcome ${studentName}` });
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Account not found or incorrect credentials. Please register first.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col justify-center items-center p-4 relative font-inter">
      
      {/* Back to Landing Page Button */}
      <button 
        onClick={() => navigate('/')}
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
          <h1 className="text-3xl font-bold text-primary-navy tracking-tight">
            {isRecoveryMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500">
            {isRecoveryMode ? 'Enter your email to receive a reset link' : 'Sign in to your campus study vault'}
          </p>
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

        {isRecoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="email"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="e.g., student@university.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className={`w-full bg-primary-navy hover:bg-[#112440] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-primary-navy/30 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p className="text-sm text-gray-500 text-center mt-6">
              Remember your password?{' '}
              <button 
                type="button" 
                onClick={() => { setIsRecoveryMode(false); setMessage({ type: '', text: '' }); }}
                className="text-primary-navy hover:underline font-semibold"
              >
                Log In
              </button>
            </p>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="block text-sm font-medium text-gray-700">Email or Phone Number</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input 
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    placeholder="e.g., student@university.edu or +2348012345678"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button 
                    type="button"
                    onClick={() => { setIsRecoveryMode(true); setMessage({ type: '', text: '' }); }} 
                    className="text-xs text-primary-navy hover:underline"
                  >
                    Forgot password?
                  </button>
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
              <Link to="/onboarding" className="text-primary-navy hover:underline font-semibold">
                Get Started
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
