import React from "react";
import { FileText, Radio, Bot, User, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function BottomNav() {
  const location = useLocation();
  const currentView = location.pathname.substring(1);
  const navItems = [
    { name: "Feed", href: "", icon: FileText, badge: null },
    { name: "Live", href: "live", icon: Radio, badge: 3 },
    { name: "Vault", href: "vault", icon: BookOpen, badge: null },
    { name: "AI Tutor", href: "ai-tutor", icon: Bot, badge: null },
    { name: "Profile", href: "profile", icon: User, badge: null },
  ];

  return (
    <nav className="w-full glass-panel-heavy border-t border-outline-variant px-6 py-2 flex justify-between items-center z-50 relative pb-safe mt-auto">
      {navItems.map((item) => {
        const isActive = currentView === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            to={`/${item.href}`}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
              isActive ? "text-primary font-bold" : "text-outline hover:text-primary hover:bg-surface-container"
            }`}
          >
            <div className="relative mb-1">
              <Icon className={`w-6 h-6 ${isActive ? "fill-primary-container/20 stroke-2" : "stroke-[1.5]"}`} />
              {item.badge !== null && (
                <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
