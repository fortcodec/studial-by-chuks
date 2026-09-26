import React, { useState, useEffect } from 'react';
import { PenTool, X, Save } from 'lucide-react';

export default function JotterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('studial_jotter_notes');
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  // Save to localStorage when notes change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('studial_jotter_notes', notes);
      setIsSaved(true);
    }, 1000); // Auto-save after 1 second of inactivity

    return () => {
      clearTimeout(timeoutId);
      setIsSaved(false);
    };
  }, [notes]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3 md:px-5 md:py-3 rounded-full shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 active:scale-95"
      >
        <PenTool className="w-5 h-5" />
        <span className="hidden md:block font-bold text-sm">Jotter</span>
      </button>

      {/* Slide-out Panel Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-indigo-400" />
              Scratchpad
            </h3>
            {isSaved ? (
              <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Save className="w-3 h-3" /> Saved
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Saving...</span>
            )}
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Jot down quick thoughts, formulas, or reminders here. They save automatically and persist across reloads!"
            className="w-full h-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none"
          />
        </div>
      </div>
    </>
  );
}
