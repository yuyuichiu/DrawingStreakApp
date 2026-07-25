import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Calendar, Snowflake, AlertCircle, Trophy, CheckCircle2 } from "lucide-react";
import { AppDatabase } from "../../types";
import { StreakService } from "../../services/streak";
import { FlameIcon } from "../components/FlameIcon";
import { CalendarModal } from "../components/CalendarModal";

export function HomeTab({
  db,
  timezone,
  userProfile,
  onUpload,
}: {
  db: AppDatabase;
  timezone: string;
  userProfile?: { name?: string; picture?: string } | null;
  onUpload: () => void;
}) {
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

  const milestones = [
    { days: 30, label: "30-day streak", achieved: currentStreak >= 30 },
    { days: 50, label: "50-day streak", achieved: currentStreak >= 50 },
    { days: 100, label: "Century streak", achieved: currentStreak >= 100 },
  ];

  const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const isPending = streakResult.status !== 'ALREADY_COMPLETED_TODAY';
  
  const displayName = userProfile?.name ? userProfile.name.split(' ')[0] : "Artist";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-6 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            {todayString}
          </p>
          <h1
            className="text-2xl font-extrabold text-foreground mt-0.5 leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Keep creating,{"\n"}{displayName}.
          </h1>
        </div>
        <div className="relative w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
          {userProfile?.picture ? (
            <img src={userProfile.picture} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-accent" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{avatarInitial}</span>
          )}
        </div>
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

      {/* Milestones */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1" style={{ fontFamily: "'Inter', sans-serif" }}>
          Milestones
        </p>
        {milestones.map((m) => (
          <div
            key={m.days}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "var(--card)",
              border: m.achieved ? "1px solid rgba(255,179,71,0.3)" : "1px solid var(--border)",
              opacity: m.achieved ? 1 : 0.6,
            }}
          >
            <Trophy
              size={18}
              style={{ color: m.achieved ? "var(--accent)" : "var(--muted-foreground)" }}
              fill={m.achieved ? "rgba(255,179,71,0.2)" : "none"}
            />
            <span className="text-sm font-medium text-foreground flex-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              {m.label}
            </span>
            {m.achieved ? (
              <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
            ) : (
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                {m.days - currentStreak > 0 ? `${m.days - currentStreak} days away` : "Upcoming"}
              </span>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} db={db} timezone={timezone} />}
      </AnimatePresence>
    </motion.div>
  );
}
