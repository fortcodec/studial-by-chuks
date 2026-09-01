import React from 'react';

export default function AuthVideoBackground({ children }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden">
      
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20"
        /* Fallback image for mobile/slower connections */
        poster="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
      >
        <source 
          src="https://assets.mixkit.co/videos/preview/mixkit-group-of-friends-studying-together-in-a-library-41977-large.mp4" 
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>

      {/* Sophisticated Gradient Overlay */}
      {/* Base dark overlay */}
      <div className="absolute inset-0 bg-slate-950/70 -z-10"></div>
      {/* Navy tint overlay for brand alignment */}
      <div className="absolute inset-0 bg-[#1A365D]/50 mix-blend-multiply -z-10"></div>

      {/* Foreground Content Wrapper */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
