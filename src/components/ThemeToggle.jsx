import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme toggle loading"
        tabIndex={-1}
        className="p-2.5 rounded-xl border transition-colors bg-white border-slate-200 dark:bg-[#1A1A1F] dark:border-[#2E2E38] shadow-sm pointer-events-none"
      >
        <span className="block w-[18px] h-[18px]" />
      </button>
    );
  }

  const currentTheme = resolvedTheme || theme;
  const isDark = currentTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle Theme"
      className="p-2.5 rounded-xl border transition-colors bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1A1A1F] dark:hover:bg-[#24242B] dark:text-slate-200 dark:border-[#2E2E38] shadow-sm"
    >
      {isDark ? (
        <Moon size={18} className="text-blue-400" />
      ) : (
        <Sun size={18} className="text-amber-500" />
      )}
    </button>
  );
}
