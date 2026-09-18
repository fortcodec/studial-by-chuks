import React, { useState } from 'react';
import { UserPlus, Mail, Lock, BookOpen, ArrowLeft, Eye, EyeOff, Key, User, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    university: '',
    otherUniversity: '',
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
      const cleanUsername = formData.username.replace(/\s+/g, '').toLowerCase();
      const finalUniversity = formData.university === 'Other' ? formData.otherUniversity : formData.university;
      
      let authResponse;
      if (isPhone) {
        const phoneValue = formData.identifier.replace(/[\s-]/g, '');
        authResponse = await supabase.auth.signUp({
          phone: phoneValue,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              username: cleanUsername,
              university: finalUniversity,
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
              full_name: formData.fullName,
              username: cleanUsername,
              university: finalUniversity,
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
      
      // Explicitly insert into profiles table to ensure name sync and admin visibility
      if (data?.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: data.user.id,
          full_name: formData.fullName,
          username: cleanUsername,
          university: finalUniversity,
          department: formData.department,
          role: 'student',
          c_coins: 0
        }]);

        if (profileError) {
          console.error("Error creating profile:", profileError);
          // If insert fails (e.g. due to an existing trigger), fallback to upsert
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: formData.fullName,
            username: cleanUsername,
            university: formData.university,
            department: formData.department,
            role: 'student',
            c_coins: 0
          });
        }
      }
      
      // Kill auto-created session on signup
      await supabase.auth.signOut();

      setMessage({ type: 'success', text: 'Account created successfully! Please sign in.' });
      
      // Proceed to login page after registration
      setTimeout(() => {
        navigate('/login');
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
          <h1 className="text-3xl font-bold text-primary-navy tracking-tight">Create Account</h1>
          <p className="text-gray-500">Join Studial - your campus social hub</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input 
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g., johndoe"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
            />
          </div>

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
              <option value="University of Lagos (UNILAG)">University of Lagos (UNILAG)</option>
              <option value="Obafemi Awolowo University (OAU)">Obafemi Awolowo University (OAU)</option>
              <option value="University of Benin (UNIBEN)">University of Benin (UNIBEN)</option>
              <option value="University of Ibadan (UI)">University of Ibadan (UI)</option>
              <option value="University of Nigeria, Nsukka (UNN)">University of Nigeria, Nsukka (UNN)</option>
              <option value="Ahmadu Bello University (ABU)">Ahmadu Bello University (ABU)</option>
              <option value="Other">Other</option>
            </select>
            {formData.university === 'Other' && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <input 
                  type="text"
                  name="otherUniversity"
                  value={formData.otherUniversity}
                  onChange={handleChange}
                  placeholder="Enter your university name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-sm font-medium text-gray-700">Search Department</label>
            <input 
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              list="departments-list"
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
            />
            <datalist id="departments-list">
              <option value="Computer Science" />
              <option value="Software Engineering" />
              <option value="Cybersecurity" />
              <option value="Information Technology" />
              <option value="Physics" />
              <option value="Chemistry" />
              <option value="Mathematics" />
              <option value="Microbiology" />
              <option value="Biochemistry" />
              <option value="Mechanical Engineering" />
              <option value="Electrical Engineering" />
              <option value="Civil Engineering" />
              <option value="Chemical Engineering" />
              <option value="Petroleum Engineering" />
              <option value="Mechatronics Engineering" />
              <option value="Computer Engineering" />
              <option value="Medicine and Surgery" />
              <option value="Nursing" />
              <option value="Pharmacy" />
              <option value="Anatomy" />
              <option value="Physiology" />
              <option value="Medical Laboratory Science" />
              <option value="Law" />
              <option value="Mass Communication" />
              <option value="English" />
              <option value="History" />
              <option value="International Relations" />
              <option value="Theatre Arts" />
              <option value="Accounting" />
              <option value="Business Administration" />
              <option value="Economics" />
              <option value="Political Science" />
              <option value="Sociology" />
              <option value="Banking and Finance" />
            </datalist>
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
          Already have an account?{' '}
          <Link to="/login" className="text-primary-navy hover:underline font-semibold">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
