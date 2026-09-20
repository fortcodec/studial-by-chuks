import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, User, FileText, ArrowLeft, Clock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Avatar } from "./Avatar";
import { useSearchHistory } from "../hooks/useSearchHistory";

export default function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { history, addSearchTerm, removeSearchTerm, clearHistory } = useSearchHistory();

  // Auto-focus when opened
  useEffect(() => {
    if (isSearchOpen) {
      // Small delay to allow the portal to render and animation to start
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isSearchOpen]);

  // Debounce the input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute the search
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedQuery.trim()) {
        setUserResults([]);
        setPostResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Query profiles
        const { data: users, error: usersError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .or(`username.ilike.%${debouncedQuery}%,full_name.ilike.%${debouncedQuery}%`)
          .limit(4);

        // Query posts
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select("id, content, profiles!user_id(id, username, avatar_url)")
          .ilike("content", `%${debouncedQuery}%`)
          .limit(4);

        if (!usersError && users) setUserResults(users);
        if (!postsError && posts) setPostResults(posts);
      } catch (error) {
        console.error("Global search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery]);

  const handleClose = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleUserClick = (userId) => {
    if (searchQuery.trim()) addSearchTerm(searchQuery);
    handleClose();
    navigate(`/profile/${userId}`);
  };

  const handlePostClick = (postId) => {
    if (searchQuery.trim()) addSearchTerm(searchQuery);
    handleClose();
    navigate("/");
  };
  
  const handleHistoryItemClick = (term) => {
    setSearchQuery(term);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addSearchTerm(searchQuery);
    }
  };

  return (
    <>
      {/* Trigger Button (Fake Input) */}
      <div className="flex-1 max-w-sm mx-4">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center bg-surface-container-low border border-outline-variant/30 rounded-full px-3 py-2 text-outline hover:bg-surface-container transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <Search className="w-4 h-4 mr-2" />
          <span className="text-[13px] font-medium">Search users, posts...</span>
        </button>
      </div>

      {/* Full-Screen Search Modal Overlay */}
      {isSearchOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-center bg-black/60 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full h-full md:h-auto md:max-h-[90vh] max-w-md md:max-w-3xl lg:max-w-4xl md:rounded-3xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 overflow-hidden shadow-2xl relative">
            
            {/* Header & Search Bar */}
            <div className="flex items-center px-4 py-3 border-b border-outline-variant/30 bg-surface">
              <button 
                onClick={handleClose}
                className="p-2 mr-2 -ml-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors active:scale-95"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-full pl-4 pr-10 py-2.5 text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20 text-[15px]"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface bg-surface-container-high rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto bg-surface">
              {/* Idle State: Recent Searches */}
              {!searchQuery.trim() ? (
                <div className="p-2">
                  {history.length > 0 ? (
                    <>
                      <h3 className="text-[13px] font-bold text-outline uppercase tracking-wider mb-2 mt-2 px-3">Recent</h3>
                      <div className="space-y-0.5">
                        {history.map((term, index) => (
                          <div key={index} className="flex items-center justify-between group rounded-xl hover:bg-surface-container-low px-3 py-2 transition-colors">
                            <button 
                              className="flex items-center gap-3 flex-1 text-left"
                              onClick={() => handleHistoryItemClick(term)}
                            >
                              <Clock className="w-5 h-5 text-outline" />
                              <span className="text-on-surface text-[15px] font-medium">{term}</span>
                            </button>
                            <button 
                              onClick={() => removeSearchTerm(term)}
                              className="p-2 -mr-2 text-outline hover:text-error transition-colors rounded-full hover:bg-error/10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-center pb-4">
                        <button 
                          onClick={clearHistory}
                          className="text-[13px] font-semibold text-outline hover:text-error transition-colors px-4 py-2 rounded-full hover:bg-error/5"
                        >
                          Clear all
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-20 text-outline">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">Search for users and posts</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Active State: Live Results */
                <div className="p-2">
                  {isSearching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Users Section */}
                      {userResults.length > 0 && (
                        <div className="mb-4">
                          <div className="text-[12px] font-bold text-outline tracking-wider uppercase px-3 mb-2 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Users
                          </div>
                          {userResults.map((user) => (
                            <button
                              key={`user-${user.id}`}
                              onClick={() => handleUserClick(user.id)}
                              className="w-full text-left px-3 py-3 hover:bg-surface-container-low transition-colors flex items-center gap-3 rounded-xl"
                            >
                              <Avatar url={user.avatar_url} name={user.username || user.full_name} size="md" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[15px] font-bold text-on-surface truncate">
                                  {user.full_name || user.username}
                                </span>
                                <span className="text-[13px] text-outline truncate">
                                  @{user.username || "student"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Posts Section */}
                      {postResults.length > 0 && (
                        <div>
                          <div className="text-[12px] font-bold text-outline tracking-wider uppercase px-3 mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Posts
                          </div>
                          {postResults.map((post) => (
                            <button
                              key={`post-${post.id}`}
                              onClick={() => handlePostClick(post.id)}
                              className="w-full text-left px-3 py-3 hover:bg-surface-container-low transition-colors flex flex-col gap-2 rounded-xl"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar url={post.profiles?.avatar_url} name={post.profiles?.username} size="sm" />
                                <span className="text-[13px] font-bold text-on-surface">
                                  @{post.profiles?.username || "student"}
                                </span>
                              </div>
                              <p className="text-[14px] text-on-surface-variant line-clamp-3 leading-relaxed pl-9">
                                {post.content}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {!isSearching && userResults.length === 0 && postResults.length === 0 && debouncedQuery && (
                        <div className="flex flex-col items-center justify-center pt-20 text-outline">
                          <p className="text-[15px] font-medium">No results found for "{searchQuery}"</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
