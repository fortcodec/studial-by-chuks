import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check current theme on mount
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#f8fafc] dark:bg-slate-900 md:border-x border-outline-variant/30 pt-[100px] pb-[90px]">
      <div className="sticky top-0 z-10 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-outline-variant/20 px-4 py-3 flex items-center shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 mr-2 -ml-2 rounded-full hover:bg-surface-container-low transition-colors text-outline hover:text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary" /> Settings
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Appearance Section */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 px-2">Appearance</h2>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 bg-surface">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Dark Mode</p>
                  <p className="text-xs text-outline">Switch between light and dark themes</p>
                </div>
              </div>
              
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isDarkMode ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Account Settings Placeholder */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 px-2">Account</h2>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-surface text-sm text-outline border-b border-outline-variant/20">
              Account settings coming soon...
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
