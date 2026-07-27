import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Calendar, Snowflake, AlertCircle, Trophy, CheckCircle2 } from "lucide-react";
import { AppDatabase } from "../../types";
import { StreakService } from "../../services/streak";
import { FlameIcon } from "../components/FlameIcon";
import { CalendarModal } from "../components/CalendarModal";
import { useAppContext } from "../../hooks/AppContext";

export function HomeTab({
  onUpload,
}: {
  onUpload: () => void;
}) {
  const { db: contextDb, timezone, updateDb } = useAppContext();
  const db = contextDb!;
  const [showCalendar, setShowCalendar] = useState(false);
  const streakResult = useMemo(() => StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone), [db, timezone]);
  const currentStreak = streakResult.streak;

  const weekData = useMemo(() => {
    const drawingsSet = new Set(db.drawings.map(d => StreakService.getStreakDay(new Date(d.date), timezone)));
    const todayStr = StreakService.getStreakDay(new Date(), timezone);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = StreakService.getStreakDay(d, timezone);
      const done = drawingsSet.has(dateStr);
      let frozen = false;

      if (!done) {
        const prevDate = new Date(d.getTime() - 24 * 60 * 60 * 1000);
        const nextDate = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        const prevStr = StreakService.getStreakDay(prevDate, timezone);
        const nextStr = StreakService.getStreakDay(nextDate, timezone);

        const prevDrawn = drawingsSet.has(prevStr);
        const nextDrawn = drawingsSet.has(nextStr);

        if (prevDrawn && nextDrawn) {
          frozen = true;
        } else if (prevDrawn && dateStr !== todayStr && nextStr === todayStr) {
          frozen = true;
        }
      }

      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
        done,
        frozen,
        today: i === 0
      });
    }
    return days;
  }, [db.drawings, timezone]);

  const rewardInterval = db.settings.rewardInterval || 0;
  const rewardProgress = db.rewardProgress || 0;
  const availableRewards = db.availableRewards || 0;
  const rewardDescription = db.settings.rewardDescription || "Custom Reward";
  
  const handleConsumeReward = async () => {
    if (availableRewards > 0) {
      await updateDb({
        ...db,
        availableRewards: availableRewards - 1,
      });
    }
  };
  const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const isPending = streakResult.status !== 'ALREADY_COMPLETED_TODAY';

  const displayName = db.settings.userName || "Artist";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-6 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          {todayString}
        </p>
        <h1
          className="text-2xl font-extrabold text-foreground mt-0.5 leading-tight break-words"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Keep creating, {displayName}.
        </h1>
      </div>

      {/* Streak Hero */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-2 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
          border: "1px solid rgba(255,107,43,0.25)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 60% 30%, #FF6B2B 0%, transparent 65%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <FlameIcon size={80} lit={currentStreak > 0} />
        </motion.div>
        <p className="text-6xl font-extrabold text-foreground leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {currentStreak}
        </p>
        <p className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          day streak
        </p>
        <div className="mt-2 px-3 py-1 rounded-full" style={{ background: "rgba(255,179,71,0.12)", border: "1px solid rgba(255,179,71,0.3)" }}>
          <span className="text-xs font-semibold text-accent" style={{ fontFamily: "'Inter', sans-serif" }}>
            🏆 Goal: Keep it going!
          </span>
        </div>
      </div>

      {/* Week calendar */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            This week
          </p>
          <button onClick={() => setShowCalendar(true)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Calendar size={14} />
          </button>
        </div>
        <div className="flex justify-between">
          {weekData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                {d.label}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: d.done
                    ? "linear-gradient(135deg, #FF6B2B, #FFB347)"
                    : d.frozen
                      ? "linear-gradient(135deg, #4A90E2, #5CACE2)"
                      : d.today
                        ? "transparent"
                        : "var(--secondary)",
                  border: (!d.done && !d.frozen && d.today) ? "2px dashed rgba(255,107,43,0.6)" : "none",
                }}
              >
                {d.done ? (
                  <Flame size={14} color="#fff" fill="#fff" />
                ) : d.frozen ? (
                  <Snowflake size={14} color="#fff" />
                ) : d.today ? (
                  <span className="text-xs font-bold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>?</span>
                ) : (
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--muted-foreground)", opacity: 0.3 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's action */}
      {isPending && (
        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,107,43,0.12)" }}>
              <AlertCircle size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Today&apos;s drawing pending
              </p>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                Upload before cutoff to keep your streak
              </p>
            </div>
            <button
              onClick={onUpload}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: "var(--primary)", fontFamily: "'Inter', sans-serif" }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Rewards Section */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Your Rewards
          </p>
          {availableRewards > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,107,43,0.15)", color: "var(--primary)" }}>
              {availableRewards} Available
            </span>
          )}
        </div>
        
        {rewardInterval > 0 ? (
          <div
            className="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
            style={{
              background: "var(--card)",
              border: availableRewards > 0 ? "1px solid rgba(255,179,71,0.5)" : "1px solid var(--border)",
              boxShadow: availableRewards > 0 ? "0 4px 20px rgba(255,179,71,0.15)" : "none",
            }}
          >
            {availableRewards > 0 && (
              <motion.div
                className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #FF6B2B 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
            
            <div className="flex items-center gap-3 relative z-10">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: availableRewards > 0 ? "linear-gradient(135deg, #FF6B2B, #FFB347)" : "var(--secondary)" }}
              >
                <Trophy size={22} color={availableRewards > 0 ? "#FFF" : "var(--muted-foreground)"} fill={availableRewards > 0 ? "rgba(255,255,255,0.2)" : "none"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {rewardDescription}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Every {rewardInterval} days
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex justify-between items-center text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                <span style={{ color: "var(--primary)" }}>{rewardProgress} days</span>
                <span className="text-muted-foreground">{rewardInterval} days</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                <motion.div 
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #FF6B2B, #FFB347)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (rewardProgress / rewardInterval) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {availableRewards > 0 && (
              <button
                onClick={handleConsumeReward}
                className="w-full mt-1 py-3 rounded-xl font-bold text-sm text-primary-foreground transition-all active:scale-95 flex justify-center items-center gap-2 relative z-10"
                style={{ background: "linear-gradient(135deg, #FF6B2B, #D94F00)", fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: "0 2px 10px rgba(255,107,43,0.3)" }}
              >
                Consume Reward
              </button>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ background: "var(--card)", border: "1px dashed var(--border)" }}
          >
             <div className="flex-1">
               <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No rewards set</p>
               <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>Setup a treat to motivate yourself.</p>
             </div>
             <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)" }}>
               <Trophy size={14} style={{ color: "var(--muted-foreground)" }} />
             </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} db={db} timezone={timezone} />}
      </AnimatePresence>
    </motion.div>
  );
}
