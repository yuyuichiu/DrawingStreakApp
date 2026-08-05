import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppDatabase } from "../../types";
import { StreakService } from "../../services/streak";

export function CalendarModal({
  onClose,
  db,
  timezone
}: {
  onClose: () => void;
  db: AppDatabase;
  timezone: string;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [swipeDir, setSwipeDir] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setSwipeDir(-1);
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setSwipeDir(1);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (e.currentTarget.getBoundingClientRect().top);
    touchStartX.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    dx < 0 ? nextMonth() : prevMonth();
  };

  const drawingsSet = new Set(db.drawings.map(d => StreakService.getStreakDay(new Date(d.date), timezone)));
  const todayStr = StreakService.getStreakDay(new Date(), timezone);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5"
      style={{ background: "rgba(22,18,13,0.85)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-[340px] rounded-3xl p-5 flex flex-col gap-4 overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-secondary"><ChevronLeft size={18} /></button>
            <h2 className="text-base font-bold text-foreground text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {currentDate.toLocaleString('default', { month: 'short' })} {year}
            </h2>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-secondary"><ChevronRight size={18} /></button>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`day-${i}`} className="text-center text-[10px] font-semibold text-muted-foreground mb-1">{d}</div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${month}`}
            initial={{ x: swipeDir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: swipeDir * -60, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="grid grid-cols-7 gap-2"
          >
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(year, month, i + 1, 12, 0, 0);
              const dateStr = StreakService.getStreakDay(date, timezone);
              const hasDrawn = drawingsSet.has(dateStr);
              let frozen = false;

              if (!hasDrawn) {
                const prevStr = StreakService.getStreakDay(new Date(date.getTime() - 86400000), timezone);
                const nextStr = StreakService.getStreakDay(new Date(date.getTime() + 86400000), timezone);
                if (drawingsSet.has(prevStr) && drawingsSet.has(nextStr)) {
                  frozen = true;
                } else if (drawingsSet.has(prevStr) && dateStr !== todayStr && nextStr === todayStr) {
                  frozen = true;
                }
              }

              let bg = "var(--secondary)";
              let color = "var(--foreground)";
              let shadow = "none";

              if (hasDrawn) {
                bg = "linear-gradient(135deg, #FF6B2B, #FFB347)";
                color = "#fff";
                shadow = "0 2px 8px rgba(255,107,43,0.25)";
              } else if (frozen) {
                bg = "linear-gradient(135deg, #4A90E2, #5CACE2)";
                color = "#fff";
                shadow = "0 2px 8px rgba(74,144,226,0.25)";
              }

              return (
                <div
                  key={i}
                  className="aspect-square rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ background: bg, color, boxShadow: shadow }}
                >
                  {i + 1}
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 42 - firstDay - daysInMonth) }).map((_, i) => <div key={`empty-end-${i}`} className="aspect-square" />)}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
