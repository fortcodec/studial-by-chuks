import { useState, useEffect } from 'react';

const STORAGE_KEY = 'studial_search_history';
const MAX_HISTORY = 15;

export function useSearchHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading search history from localStorage', e);
      return [];
    }
  });

  // Sync to local storage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Error saving search history to localStorage', e);
    }
  }, [history]);

  const addSearchTerm = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setHistory(prev => {
      // Remove duplicate if it exists, so we can bring it to the front
      const filtered = prev.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
      // Add to front and slice to max length
      return [trimmed, ...filtered].slice(0, MAX_HISTORY);
    });
  };

  const removeSearchTerm = (termToRemove) => {
    setHistory(prev => prev.filter(t => t !== termToRemove));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addSearchTerm,
    removeSearchTerm,
    clearHistory
  };
}
