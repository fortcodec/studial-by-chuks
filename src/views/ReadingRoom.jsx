import React, { useState } from 'react';
import { Moon, Sun, ArrowLeft, MessageSquare, X, Download, Share2 } from 'lucide-react';

export default function ReadingRoom({ navigateTo, darkMode, setDarkMode }) {
  const [showDiscussion, setShowDiscussion] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col font-inter transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-neutral-background text-gray-900'}`}>
      
      {/* Top Navbar */}
      <header className={`p-4 shadow-sm flex justify-between items-center z-10 sticky top-0 ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('campusHub')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">MTH 201 Past Questions - 2023</h1>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mathematics • PDF</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className={`p-2 rounded-full hidden md:block transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Download size={20} />
          </button>
          <button className={`p-2 rounded-full hidden md:block transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => setShowDiscussion(!showDiscussion)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
              darkMode ? 'bg-primary-navy text-white hover:bg-[#2a4d80]' : 'bg-primary-navy text-white hover:bg-[#112440]'
            }`}
          >
            <MessageSquare size={18} />
            <span className="hidden md:inline">Discuss</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Document Viewer (Mock) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className={`w-full max-w-3xl aspect-[1/1.4] shadow-lg rounded-xl flex items-center justify-center p-8 text-center border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
          }`}>
            <div>
              <p className="text-lg font-semibold mb-2">Document Content Placeholder</p>
              <p className="text-sm">In a real implementation, a PDF viewer or rich text content would render here.</p>
            </div>
          </div>
        </div>

        {/* Discussion Sidebar / Bottom Sheet */}
        <aside className={`
          absolute md:relative right-0 bottom-0 top-0 
          w-full md:w-80 lg:w-96 
          transform transition-transform duration-300 ease-in-out z-20 flex flex-col
          ${showDiscussion ? 'translate-x-0' : 'translate-x-full md:hidden'}
          ${showDiscussion && 'md:translate-x-0 md:flex'}
          ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200 shadow-xl md:shadow-none'}
        `}>
          
          <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className="font-bold text-lg">Study Discussion</h3>
            <button onClick={() => setShowDiscussion(false)} className="md:hidden p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mock Comments */}
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm">Alex</span>
                <span className="text-xs text-gray-400">10m ago</span>
              </div>
              <p className="text-sm">Does anyone understand the derivation on page 4?</p>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm">Sarah</span>
                <span className="text-xs text-gray-400">2m ago</span>
              </div>
              <p className="text-sm">Yes, it's based on the chain rule we did last week.</p>
            </div>
          </div>

          {/* Comment Input */}
          <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <textarea 
              placeholder="Ask a question..." 
              className={`w-full rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary-navy text-sm resize-none ${
                darkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-gray-50 border border-gray-300'
              }`}
              rows="2"
            ></textarea>
            <button className="w-full mt-2 bg-primary-navy text-white py-2 rounded-lg text-sm font-medium hover:bg-[#112440] transition">
              Send
            </button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {showDiscussion && (
          <div 
            className="absolute inset-0 bg-black/50 md:hidden z-10"
            onClick={() => setShowDiscussion(false)}
          />
        )}

      </main>
    </div>
  );
}
