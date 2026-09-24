import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";

function ThemeModal({ currentTheme, onClose, onSave }) {
  const [selected, setSelected] = useState(currentTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="p-5">
          <h3 className="text-lg font-bold text-on-surface mb-4">Choose theme</h3>
          <div className="space-y-4">
            {['system', 'light', 'dark'].map((t) => (
              <label key={t} className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === t ? 'border-primary' : 'border-outline'}`}>
                  {selected === t && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
                <span className="text-on-surface font-medium capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-3 pr-4 border-t border-outline-variant/20">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(selected)}
            className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

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
            <div 
              onClick={() => setShowThemeModal(true)}
              className="flex items-center justify-between p-4 bg-surface cursor-pointer hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Theme</p>
                  <p className="text-xs text-outline">Current: {currentLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Theme Selection Modal */}
        {showThemeModal && (
          <ThemeModal 
            currentTheme={theme} 
            onClose={() => setShowThemeModal(false)} 
            onSave={(newTheme) => { setTheme(newTheme); setShowThemeModal(false); }} 
          />
        )}

        {/* Account Settings Placeholder */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">Account</h2>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-surface text-sm text-slate-900 dark:text-slate-100 border-b border-outline-variant/20">
              Account settings coming soon...
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
