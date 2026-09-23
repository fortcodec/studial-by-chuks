import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Determine if dark mode is active based on the selected theme
  const isDarkMode = (() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // system
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  })();

  // UI helper to display current selection
  const currentLabel = theme === 'system' ? 'System' : theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#f8fafc] dark:bg-slate-900 md:border-x border-outline-variant/30 pt-4 pb-[90px]">
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
                  <p className="font-semibold text-on-surface">Theme</p>
                  <p className="text-xs text-outline">Current: {currentLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setShowThemeModal(true)}
                className="px-3 py-1 text-sm font-medium bg-primary text-white rounded-full hover:bg-primary/90 transition"
              >
                Change
              </button>
            </div>
          </div>
        </section>

        {/* Theme Selection Modal */}
        {showThemeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4 text-on-surface">Select Theme</h3>
              <div className="space-y-3">
                <button
                  onClick={() => { setTheme('system'); setShowThemeModal(false); }}
                  className="w-full flex justify-between items-center px-4 py-2 border rounded hover:bg-surface-container-low"
                >
                  System
                  {theme === 'system' && <span className="text-primary">✓</span>}
                </button>
                <button
                  onClick={() => { setTheme('light'); setShowThemeModal(false); }}
                  className="w-full flex justify-between items-center px-4 py-2 border rounded hover:bg-surface-container-low"
                >
                  Light
                  {theme === 'light' && <span className="text-primary">✓</span>}
                </button>
                <button
                  onClick={() => { setTheme('dark'); setShowThemeModal(false); }}
                  className="w-full flex justify-between items-center px-4 py-2 border rounded hover:bg-surface-container-low"
                >
                  Dark
                  {theme === 'dark' && <span className="text-primary">✓</span>}
                </button>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="mt-4 w-full text-center text-sm text-primary underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
