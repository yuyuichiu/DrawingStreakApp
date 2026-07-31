import React from "react";
import { Flame, Pencil, BookOpen, Settings } from "lucide-react";
import { Tab } from "../../types";

export function BottomNav({
  active,
  onSelect,
  todayDone,
}: {
  active: Tab;
  onSelect: (t: Tab) => void;
  todayDone: boolean;
}) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <Flame size={22} />, label: "Streak" },
    { id: "upload", icon: <Pencil size={22} />, label: "Today" },
    { id: "gallery", icon: <BookOpen size={22} />, label: "Gallery" },
    { id: "settings", icon: <Settings size={22} />, label: "Settings" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] flex items-center justify-around border-t border-border"
      style={{ background: "var(--card)", paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        const showDot = t.id === "upload" && !todayDone;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="relative flex flex-col items-center gap-0.5 py-3 px-4 min-w-[60px] transition-colors duration-150"
            style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
          >
            <span className="relative">
              {t.icon}
              {showDot && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
              )}
            </span>
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
