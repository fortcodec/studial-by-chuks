import React, { useState } from 'react';
import { UserPlus, Mail, Lock, BookOpen, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Onboarding({ navigateTo }) {
  const [formData, setFormData] = useState({
    university: '',
    department: '',
    identifier: '',
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
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setMessage({ type: 'error', text: 'Password must be at least 8 characters and include a letter, a number, and a special symbol.' });
        setLoading(false);
        return;
      }

      const isPhone = formData.identifier.startsWith('+') && /\d/.test(formData.identifier);
      
      let authResponse;
      if (isPhone) {
        const phoneValue = formData.identifier.replace(/[\s-]/g, '');
        authResponse = await supabase.auth.signUp({
          phone: phoneValue,
          password: formData.password,
          options: {
            data: {
              university: formData.university,
              department: formData.department
            }
          }
        });
      } else {
        authResponse = await supabase.auth.signUp({
          email: formData.identifier,
          password: formData.password,
          options: {
            data: {
              university: formData.university,
              department: formData.department
            }
          }
        });
      }

      const { data, error: authError } = authResponse;

      if (authError) {
        setMessage({ type: 'error', text: authError.message });
        setLoading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Congratulations! Registration successful' });
      
      // Proceed to login page after registration
      setTimeout(() => {
        navigateTo('login');
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'An error occurred during registration.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col items-center justify-center py-10 px-4 relative font-inter">
      
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
          <h1 className="text-3xl font-bold text-primary-navy tracking-tight">Create Account</h1>
          <p className="text-gray-500">Join your campus social hub</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Select University</label>
            <select 
              name="university"
              value={formData.university}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
            >
              <option value="" disabled>Choose your institution...</option>
              <option value="Federal University, Lokoja">Federal University, Lokoja</option>
              <option value="Nnamdi Azikiwe University, Awka">Nnamdi Azikiwe University, Awka</option>
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Select Department</label>
            <select 
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
            >
              <option value="" disabled>Choose your department...</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Estate Management">Estate Management</option>
              <option value="Mass Communication">Mass Communication</option>
            </select>
          </div>

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
            <label className="block text-sm font-medium text-gray-700">Password</label>
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
            className={`w-full bg-primary-navy hover:bg-[#112440] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary-navy/30 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <UserPlus size={20} />
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
        
        <p className="text-sm text-gray-500 text-center mt-6">
          Admin access? <button onClick={() => navigateTo('adminGateway')} className="text-secondary-green hover:underline font-semibold">Login here</button>
        </p>
      </div>
    </div>
  );
}
