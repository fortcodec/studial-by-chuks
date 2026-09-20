import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Avatar } from "./Avatar";

export default function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  
  const searchRef = useRef(null);
  const navigate = useNavigate();

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserClick = (userId) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(`/profile/${userId}`);
  };

  const handlePostClick = (postId) => {
    // Currently no dedicated post view, but we can close search and go to dashboard
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate("/");
  };

  return (
    <div className="flex-1 max-w-sm mx-4 relative" ref={searchRef}>
      <div
        className={`flex items-center bg-surface-container-low border border-outline-variant/30 rounded-full px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 ${
          isSearchOpen ? "ring-2 ring-primary/20 bg-surface-container" : ""
        }`}
      >
        <Search className="w-4 h-4 text-outline" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Search users, posts..."
          className="w-full bg-transparent border-none outline-none text-[13px] px-2 text-on-surface placeholder-outline"
        />
        {isSearching && <Loader2 className="w-3 h-3 text-outline animate-spin mr-1" />}
      </div>

      {isSearchOpen && searchQuery.trim() && (
        <div className="absolute top-full mt-2 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden z-50 max-h-[70vh] flex flex-col">
          <div className="overflow-y-auto p-2">
            
            {/* Users Section */}
            {userResults.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-outline tracking-wider uppercase px-2 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Users
                </div>
                {userResults.map((user) => (
                  <button
                    key={`user-${user.id}`}
                    onClick={() => handleUserClick(user.id)}
                    className="w-full text-left px-2 py-2 hover:bg-surface-container-low transition-colors flex items-center gap-3 rounded-lg"
                  >
                    <Avatar url={user.avatar_url} name={user.username || user.full_name} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-on-surface truncate">
                        {user.full_name || user.username}
                      </span>
                      <span className="text-[11px] text-outline truncate">
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
                <div className="text-xs font-semibold text-outline tracking-wider uppercase px-2 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Posts
                </div>
                {postResults.map((post) => (
                  <button
                    key={`post-${post.id}`}
                    onClick={() => handlePostClick(post.id)}
                    className="w-full text-left px-2 py-2 hover:bg-surface-container-low transition-colors flex flex-col gap-1 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar url={post.profiles?.avatar_url} name={post.profiles?.username} size="xs" />
                      <span className="text-[11px] font-bold text-on-surface">
                        @{post.profiles?.username || "student"}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!isSearching && userResults.length === 0 && postResults.length === 0 && (
              <div className="p-4 text-center text-sm text-outline">
                No results found for "{searchQuery}"
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
