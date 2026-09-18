import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import AdminGuard from './components/AdminGuard';
import StudentGuard from './components/StudentGuard';
import SessionTimeout from './components/SessionTimeout';

// Lazy load route components for code splitting
const LandingPage = lazy(() => import('./views/LandingPage'));
const Onboarding = lazy(() => import('./views/Onboarding'));
const Login = lazy(() => import('./views/Login'));
const UpdatePassword = lazy(() => import('./views/UpdatePassword'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const LiveStudyRoom = lazy(() => import('./views/LiveStudyRoom'));
const Library = lazy(() => import('./views/Library'));
const StudyRoom = lazy(() => import('./views/StudyRoom'));
const TasksHub = lazy(() => import('./views/TasksHub'));
const AdminGateway = lazy(() => import('./views/AdminGateway'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const AITutorView = lazy(() => import('./views/AITutorView'));

// Unified loading fallback
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
  </div>
);

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/landing" element={session ? <Navigate to="/" replace /> : <LandingPage />} />
            <Route path="/onboarding" element={session ? <Navigate to="/" replace /> : <Onboarding />} />
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* Protected Routes */}
            {session ? (
              <Route element={<SessionTimeout><Outlet /></SessionTimeout>}>
                <Route element={<StudentGuard />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/live" element={<LiveStudyRoom />} />
                    <Route path="/samuel" element={<AITutorView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/profile/:id" element={<ProfileView />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/studyRoom" element={<StudyRoom />} />
                    <Route path="/tasksHub" element={<TasksHub />} />
                  </Route>
                </Route>
                
                <Route element={<AdminGuard />}>
                  <Route path="/admin" element={<AdminGateway />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/landing" replace />} />
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;
