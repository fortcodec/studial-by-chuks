import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live" element={<LiveStudyRoom />} />
            <Route path="/aiTutor" element={<div className="flex h-screen items-center justify-center font-bold">AI Tutor Coming Soon</div>} />
            <Route path="/profile" element={<div className="flex h-screen items-center justify-center font-bold">Profile Coming Soon</div>} />
          </Route>
          
          <Route path="/vault" element={<Vault />} />
          <Route path="/studyRoom" element={<StudyRoom />} />
          <Route path="/tasksHub" element={<TasksHub />} />
          <Route path="/adminGateway" element={<AdminGateway />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
