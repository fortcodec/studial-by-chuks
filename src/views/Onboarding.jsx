import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Lock, BookOpen, ArrowLeft, Eye, EyeOff, Key, User, CheckCircle, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const DEPARTMENTS = [
  "Computer Science", "Software Engineering", "Cybersecurity", "Information Technology",
  "Physics", "Chemistry", "Mathematics", "Microbiology", "Biochemistry",
  "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", 
  "Chemical Engineering", "Petroleum Engineering", "Mechatronics Engineering", "Computer Engineering",
  "Medicine and Surgery", "Nursing", "Pharmacy", "Anatomy", "Physiology", "Medical Laboratory Science",
  "Law", "Mass Communication", "English", "History", "International Relations", "Theatre Arts",
  "Accounting", "Business Administration", "Economics", "Political Science", "Sociology", "Banking and Finance"
];

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
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState(DEPARTMENTS);

  // Validation State
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken
  const [identifierStatus, setIdentifierStatus] = useState('idle'); // idle, checking, available, taken
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  
  // Debounce effects
  useEffect(() => {
    const checkUsername = async () => {
      const cleanUsername = formData.username.replace(/\s+/g, '').toLowerCase();
      if (!cleanUsername) {
        setUsernameStatus('idle');
        setUsernameSuggestions([]);
        return;
      }
      
      setUsernameStatus('checking');
      const { data, error } = await supabase.from('profiles').select('id').eq('username', cleanUsername);
      
      if (!error && data && data.length > 0) {
        setUsernameStatus('taken');
        // Generate suggestions
        const suggestions = [
          `${cleanUsername}_1`,
          `${cleanUsername}99`,
          `${cleanUsername}_student`
        ];
        setUsernameSuggestions(suggestions);
      } else {
        setUsernameStatus('available');
        setUsernameSuggestions([]);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  useEffect(() => {
    const checkIdentifier = async () => {
      const id = formData.identifier.trim();
      if (!id) {
        setIdentifierStatus('idle');
        return;
      }

      setIdentifierStatus('checking');
      const isPhone = id.startsWith('+') && /\d/.test(id);
      const column = isPhone ? 'phone' : 'email';
      const cleanId = isPhone ? id.replace(/[\s-]/g, '') : id.toLowerCase();
      
      const { data, error } = await supabase.from('profiles').select('id').eq(column, cleanId);
      
      if (!error && data && data.length > 0) {
        setIdentifierStatus('taken');
      } else {
        setIdentifierStatus('available');
      }
    };

    const timer = setTimeout(checkIdentifier, 500);
    return () => clearTimeout(timer);
  }, [formData.identifier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'department') {
      const filtered = DEPARTMENTS.filter(d => d.toLowerCase().includes(value.toLowerCase()));
      setFilteredDepartments(filtered);
      setShowDeptDropdown(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (usernameStatus === 'taken' || identifierStatus === 'taken' || usernameStatus === 'checking' || identifierStatus === 'checking') {
      setMessage({ type: 'error', text: 'Please resolve validation errors before submitting.' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'error', text: '' });

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
        const phoneValue = isPhone ? formData.identifier.replace(/[\s-]/g, '') : null;
        const emailValue = isPhone ? null : formData.identifier.toLowerCase();
        
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: data.user.id,
          full_name: formData.fullName,
          username: cleanUsername,
          university: finalUniversity,
          department: formData.department,
          role: 'student',
          c_coins: 0,
          phone: phoneValue,
          email: emailValue
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
            c_coins: 0,
            phone: phoneValue,
            email: emailValue
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
            <div className="relative">
              <input 
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g., johndoe"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition bg-gray-50 text-gray-900 pr-10
                  ${usernameStatus === 'taken' ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 
                    usernameStatus === 'available' ? 'border-green-300 focus:ring-green-200 focus:border-green-500' : 
                    'border-gray-300 focus:ring-primary-navy focus:border-primary-navy'}`}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                {usernameStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {usernameStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" />}
              </div>
            </div>
            {usernameStatus === 'taken' && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-xs text-red-600 mb-2 font-medium">This username is already taken. Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData({ ...formData, username: suggestion })}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors border border-gray-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          <div className="space-y-1 text-left relative">
            <label className="block text-sm font-medium text-gray-700">Search Department</label>
            <input 
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              onFocus={() => {
                setFilteredDepartments(DEPARTMENTS.filter(d => d.toLowerCase().includes(formData.department.toLowerCase())));
                setShowDeptDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowDeptDropdown(false), 200)}
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-navy focus:border-primary-navy outline-none transition bg-gray-50 text-gray-900"
              required
              autoComplete="off"
            />
            {showDeptDropdown && filteredDepartments.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredDepartments.map((dept, index) => (
                  <li 
                    key={index}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, department: dept }));
                      setShowDeptDropdown(false);
                    }}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-800 border-b border-gray-100 last:border-0"
                  >
                    {dept}
                  </li>
                ))}
              </ul>
            )}
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
                  className={`w-full pl-10 pr-10 py-3 rounded-lg border focus:ring-2 outline-none transition bg-gray-50 
                    ${identifierStatus === 'taken' ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 
                      identifierStatus === 'available' ? 'border-green-300 focus:ring-green-200 focus:border-green-500' : 
                      'border-gray-300 focus:ring-primary-navy focus:border-primary-navy'}`}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {identifierStatus === 'checking' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                  {identifierStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {identifierStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
              {identifierStatus === 'taken' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-xs text-red-600 font-medium">This email or phone number is already registered. Please sign in instead.</p>
                </div>
              )}
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
