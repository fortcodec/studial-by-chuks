import React, { useState, useRef } from 'react';
import { Edit3, Users, HelpCircle, FileText } from 'lucide-react';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  // Auto-expand textarea
  const handleInput = (e) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="bg-white rounded-[24px] shadow-surface-1 p-4 mb-6 border border-outline-variant/30">
      <div className="flex gap-3">
        {/* Avatar Placeholder */}
        <div className="flex-shrink-0 relative">
          <img 
            src="https://i.pravatar.cc/150?img=33" 
            alt="User Avatar" 
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/30"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container border-2 border-white rounded-full"></div>
        </div>

        {/* Text Area */}
        <div className="flex-grow bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 flex items-center">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            placeholder="Share notes, ask doubts, or start a study sprint..."
            className="w-full resize-none border-none focus:ring-0 p-1 text-on-surface placeholder-outline bg-transparent min-h-[24px] text-sm leading-relaxed overflow-hidden outline-none font-medium"
            rows={1}
          />
          <Edit3 className="w-5 h-5 text-primary ml-2 flex-shrink-0" />
        </div>
      </div>

      {/* Bottom Bar: Action Chips */}
      <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full whitespace-nowrap hover:bg-surface-container transition-colors active:scale-95"
        >
          <FileText className="w-4 h-4 text-secondary-container" />
          <span className="text-sm font-semibold text-on-surface">Upload Notes</span>
          <span className="text-[10px] font-bold text-primary bg-primary-container/10 px-1.5 py-0.5 rounded-md ml-1">
            +15 C
          </span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full whitespace-nowrap hover:bg-surface-container transition-colors active:scale-95"
        >
          <HelpCircle className="w-4 h-4 text-error" />
          <span className="text-sm font-semibold text-on-surface">Ask Doubt</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center p-2 bg-surface-container-low border border-outline-variant/30 rounded-full hover:bg-surface-container transition-colors active:scale-95"
        >
          <Users className="w-4 h-4 text-primary" />
        </button>
      </div>
    </div>
  );
}
