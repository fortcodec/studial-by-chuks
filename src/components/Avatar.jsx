import React from 'react';

export function Avatar({ url, name, size = "md", className = "" }) {
  // Map size prop to Tailwind dimensions
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-sm",
    xl: "w-24 h-24 text-4xl"
  };

  const dimensions = sizeClasses[size] || sizeClasses.md;
  const initial = (name || 'S').charAt(0).toUpperCase();

  if (url && url.startsWith('http')) {
    return (
      <img 
        src={url} 
        alt={name || "Avatar"} 
        className={`${dimensions} rounded-full object-cover shrink-0 ${className}`} 
      />
    );
  }

  return (
    <div className={`${dimensions} rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm ${className}`}>
      {initial}
    </div>
  );
}
