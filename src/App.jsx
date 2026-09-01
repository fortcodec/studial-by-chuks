import React, { useState } from 'react';
import LandingPage from './views/LandingPage';
import Onboarding from './views/Onboarding';
import Login from './views/Login';
import CampusHub from './views/CampusHub';
import ReadingRoom from './views/ReadingRoom';
import AdminGateway from './views/AdminGateway';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [darkMode, setDarkMode] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage navigateTo={setCurrentView} />;
      case 'onboarding':
        return <Onboarding navigateTo={setCurrentView} />;
      case 'login':
        return <Login navigateTo={setCurrentView} />;
      case 'campusHub':
        return <CampusHub navigateTo={setCurrentView} />;
      case 'readingRoom':
        return <ReadingRoom navigateTo={setCurrentView} darkMode={darkMode} setDarkMode={setDarkMode} />;
      case 'adminGateway':
        return <AdminGateway navigateTo={setCurrentView} />;
      default:
        return <LandingPage navigateTo={setCurrentView} />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {renderView()}
    </div>
  );
}

export default App;
