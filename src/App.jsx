import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import LandingPage from './views/LandingPage';
import Onboarding from './views/Onboarding';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import LiveStudyRoom from './views/LiveStudyRoom';
import Vault from './views/Vault';
import StudyRoom from './views/StudyRoom';
import TasksHub from './views/TasksHub';
import AdminGateway from './views/AdminGateway';
import Layout from './components/Layout';
import ProfileView from './views/ProfileView';
import AdminGuard from './components/AdminGuard';
import AITutorView from './views/AITutorView';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={session ? <Navigate to="/" replace /> : <LandingPage />} />
          <Route path="/onboarding" element={session ? <Navigate to="/" replace /> : <Onboarding />} />
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

          {/* Protected Routes */}
          {session ? (
            <>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/live" element={<LiveStudyRoom />} />
                <Route path="/ai-tutor" element={<AITutorView />} />
                <Route path="/profile" element={<ProfileView />} />
              </Route>
              
              <Route path="/vault" element={<Vault />} />
              <Route path="/studyRoom" element={<StudyRoom />} />
              <Route path="/tasksHub" element={<TasksHub />} />
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminGateway />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/landing" replace />} />
          )}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
