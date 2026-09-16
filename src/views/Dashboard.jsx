import React, { useState } from "react";
import { Bell } from "lucide-react";
import CreatePost from "../components/CreatePost";
import { PostCard, LiveRoomCard } from "../components/PostCard";
import { BottomNav } from "../components/BottomNav";

export default function Dashboard({ navigateTo, currentView }) {
  // Prepared dynamic states
  const [currentUser, setCurrentUser] = useState({
    name: "Fortune",
    c_coins: 1450,
    avatar: "https://i.pravatar.cc/150?img=33",
  });
  const [hasNotifications, setHasNotifications] = useState(true);

  const topics = ["All Topics", "⚡ Trending in CS", "Calculus III", "Organic Chem"];

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden max-w-md mx-auto shadow-2xl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-4 flex justify-between items-center border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-surface-1">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-on-primary">
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" />
              <path d="M2 13l10 5 10-5M2 18l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Studial.</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-warning text-sm drop-shadow-sm">🪙</span>
            <span className="text-[13px] font-bold text-on-surface">{currentUser.c_coins.toLocaleString()} C</span>
          </div>
          
          <button className="relative text-outline hover:text-on-surface transition-colors active:scale-95">
            <Bell className="w-6 h-6" />
            {hasNotifications && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
            )}
          </button>
          
          <img 
            src={currentUser.avatar} 
            alt="Profile" 
            className="w-9 h-9 rounded-full object-cover border-2 border-surface-container-low shadow-sm"
          />
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 px-5 py-6 overflow-y-auto pb-24 scrollbar-hide">
        <CreatePost />

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1 -mx-5 px-5">
          {topics.map((topic, idx) => (
            <button
              key={topic}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors active:scale-95 ${
                idx === 0 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Feed Posts */}
        <PostCard 
          type="bounty"
          author={{ name: "Marcus Chen", school: "Stanford '26", avatar: "https://i.pravatar.cc/150?img=11" }}
          course="CS 106B"
          topic="Algorithmic Analysis"
          timeAgo="12m ago"
          content="Can anyone help explain why Dijkstra's algorithm fails with negative edge weights? Preparing for tomorrow's midterm exam! Here's my graph diagram sketch 📝"
          bountyAmount={50}
          bountyDesc="best formal proof"
          attachmentImage="https://images.unsplash.com/photo-1596495578065-6e0763fa1178?q=80&w=2071&auto=format&fit=crop"
          stats={{ upvotes: 42, answers: 8 }}
        />

        <LiveRoomCard />

        <PostCard 
          type="document"
          author={{ name: "Elena Rostova", school: "MIT '25", avatar: "https://i.pravatar.cc/150?img=5" }}
          course="BioE 120"
          topic="Cellular Bio"
          timeAgo="1h ago"
          content="Uploaded my complete cheatsheet for Cellular Metabolism (Glycolysis & Krebs Cycle) with high-res mnemonics! Free download for peer study circle members."
          docTitle="Krebs_Cycle_Summary_v..."
          docPages={8}
          docRating={4.9}
          docReviews={148}
          docSaves="1.2k"
          stats={{ upvotes: 184, answers: 22 }}
        />
      </div>

      <BottomNav navigateTo={navigateTo} currentView={currentView} />
    </div>
  );
}
