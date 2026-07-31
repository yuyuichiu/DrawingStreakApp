import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Calendar, Snowflake, AlertCircle, Trophy, Pencil, X, Check } from "lucide-react";
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

  const [showRewardEdit, setShowRewardEdit] = useState(false);
  const [editInterval, setEditInterval] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [inheritStreak, setInheritStreak] = useState(true);
  const [keepProgress, setKeepProgress] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [consuming, setConsuming] = useState(false);

  const openRewardEdit = () => {
    setEditInterval(rewardInterval > 0 ? String(rewardInterval) : "");
    setEditDescription(db.settings.rewardDescription || "");
    setInheritStreak(true);
    setKeepProgress(true);
    setConfirmRemove(false);
    setShowRewardEdit(true);
  };

  const saveRewardEdit = async () => {
    const newInterval = parseInt(editInterval, 10);
    const newIntervalVal = isNaN(newInterval) || newInterval < 0 ? 0 : newInterval;
    let newProgress = db.rewardProgress ?? 0;
    let newAvailableRewards = db.availableRewards ?? 0;

    if (newIntervalVal === 0) {
      newProgress = 0;
    } else if (rewardInterval === 0 && newIntervalVal > 0 && currentStreak > 0) {
      if (inheritStreak) {
        newAvailableRewards += Math.floor(currentStreak / newIntervalVal);
        newProgress = currentStreak % newIntervalVal;
      } else {
        newProgress = 0;
      }
    } else if (newIntervalVal !== rewardInterval && newProgress > 0 && !keepProgress) {
      newProgress = 0;
    }

    setIsSaving(true);
    await updateDb({
      ...db,
      settings: { ...db.settings, rewardInterval: newIntervalVal, rewardDescription: editDescription },
      rewardProgress: newProgress,
      availableRewards: newAvailableRewards,
    });
    setIsSaving(false);
    setShowRewardEdit(false);
  };

  const doRemoveReward = async () => {
    setIsSaving(true);
    await updateDb({
      ...db,
      settings: { ...db.settings, rewardInterval: 0, rewardDescription: "" },
      rewardProgress: 0,
      availableRewards: 0,
    });
    setIsSaving(false);
    setShowRewardEdit(false);
  };

  const handleConsumeReward = useCallback(async () => {
    if (availableRewards <= 0 || consuming) return;
    setConsuming(true);
    await updateDb({ ...db, availableRewards: availableRewards - 1 });
    setTimeout(() => setConsuming(false), 1200);
  }, [availableRewards, consuming, db, updateDb]);
  const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const isPending = streakResult.status !== 'ALREADY_COMPLETED_TODAY';

  const displayName = db.settings.userName || "Artist";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-28 flex flex-col gap-6"
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
          <div className="flex items-center gap-2">
            {availableRewards > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,107,43,0.15)", color: "var(--primary)" }}>
                {availableRewards} Available
              </span>
            )}
            <button
              onClick={openRewardEdit}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Edit reward settings"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>
        
        {rewardInterval > 0 ? (
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: "var(--card)",
              border: availableRewards > 0 ? "1px solid rgba(255,179,71,0.5)" : "1px solid var(--border)",
              boxShadow: availableRewards > 0 ? "0 4px 20px rgba(255,179,71,0.15)" : "none",
            }}
          >
            {availableRewards > 0 && (
              <motion.div
                className="absolute -right-4 -top-4 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(255,179,71,0.2) 0%, transparent 70%)", zIndex: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}

            {/* Header row */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 relative z-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm relative"
                style={{ background: availableRewards > 0 ? "linear-gradient(135deg, #FF6B2B, #FFB347)" : "var(--secondary)" }}
              >
                <Trophy size={22} color={availableRewards > 0 ? "#FFF" : "var(--muted-foreground)"} fill={availableRewards > 0 ? "rgba(255,255,255,0.2)" : "none"} />
                {availableRewards > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: "#D94F00", border: "2px solid var(--card)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {availableRewards}
                  </span>
                )}
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

            {/* Ready-to-claim banner */}
            <AnimatePresence>
              {availableRewards > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mx-5 mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.12), rgba(255,179,71,0.1))", border: "1px solid rgba(255,179,71,0.3)" }}
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--primary)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {availableRewards} reward{availableRewards !== 1 ? "s" : ""} ready
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Tap below to claim
                      </p>
                    </div>
                    <span className="text-2xl">🎁</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar — next reward cycle */}
            <div className="flex flex-col gap-2 px-5 pb-5 relative z-10">
              <div className="flex justify-between items-center text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                <span className="text-muted-foreground">{availableRewards > 0 ? "Next reward" : "Progress"}</span>
                <span style={{ color: "var(--primary)" }}>{rewardProgress} / {rewardInterval} days</span>
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

            {/* Consume button */}
            {availableRewards > 0 && (
              <div className="px-5 pb-5 relative z-10">
                <button
                  onClick={handleConsumeReward}
                  disabled={consuming}
                  className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground transition-all active:scale-95 flex justify-center items-center gap-2 overflow-hidden"
                  style={{
                    background: consuming ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #FF6B2B, #D94F00)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: consuming ? "0 2px 10px rgba(34,197,94,0.3)" : "0 2px 10px rgba(255,107,43,0.3)",
                    transition: "background 0.3s, box-shadow 0.3s",
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {consuming ? (
                      <motion.span
                        key="enjoyed"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check size={16} />
                        Enjoyed!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="consume"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        🎉 Consume Reward
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 flex flex-col gap-1"
            style={{ background: "var(--card)", border: "1px dashed var(--border)" }}
          >
            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No rewards set</p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Tap ✏️ above to set up a treat to motivate yourself.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} db={db} timezone={timezone} />}
      </AnimatePresence>

      {/* Reward Edit Bottom Sheet */}
      <AnimatePresence>
        {showRewardEdit && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRewardEdit(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
              style={{
                background: "var(--card)",
                borderTop: "1px solid var(--border)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                maxHeight: "90dvh",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              {/* Handle + Header — always visible, never scrolls */}
              <div className="flex flex-col items-center gap-4 px-5 pt-5 pb-2 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
                <div className="flex items-center justify-between w-full">
                  <p className="text-base font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Configure Reward</p>
                  <button
                    onClick={() => setShowRewardEdit(false)}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "var(--secondary)" }}
                  >
                    <X size={16} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>
              </div>

              {/* Scrollable fields — safe when keyboard is open */}
              <div className="flex flex-col gap-5 px-5 py-4 overflow-y-auto">
                {/* Interval Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Day needed for a reward
                  </label>
                  <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={editInterval}
                      onChange={(e) => setEditInterval(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-foreground font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 16 }}
                    />
                  </div>
                </div>

                {/* Description Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                    What to reward yourself with
                  </label>
                  <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-foreground font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 16 }}
                    />
                  </div>
                </div>

                {/* Inherit streak toggle — shown only when enabling for the first time with an active streak */}
                {!isSaving && rewardInterval === 0 && currentStreak > 0 && (
                  <button
                    onClick={() => setInheritStreak(v => !v)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 w-full text-left"
                    style={{ background: inheritStreak ? "rgba(255,107,43,0.08)" : "var(--secondary)", border: `1px solid ${inheritStreak ? "rgba(255,107,43,0.3)" : "var(--border)"}`, transition: "background 0.2s, border 0.2s" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Count current streak</p>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>Start from your {currentStreak}-day streak instead of zero</p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-3"
                      style={{ background: inheritStreak ? "var(--primary)" : "var(--border)", transition: "background 0.2s" }}
                    >
                      {inheritStreak && <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )}

                {/* Keep-progress toggle — shown when changing an existing interval with progress */}
                {!isSaving && rewardInterval > 0 && parseInt(editInterval, 10) !== rewardInterval && rewardProgress > 0 && (
                  <button
                    onClick={() => setKeepProgress(v => !v)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 w-full text-left"
                    style={{ background: keepProgress ? "rgba(255,107,43,0.08)" : "var(--secondary)", border: `1px solid ${keepProgress ? "rgba(255,107,43,0.3)" : "var(--border)"}`, transition: "background 0.2s, border 0.2s" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Keep current progress</p>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>Carry over your {rewardProgress} day{rewardProgress !== 1 ? "s" : ""} of progress</p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-3"
                      style={{ background: keepProgress ? "var(--primary)" : "var(--border)", transition: "background 0.2s" }}
                    >
                      {keepProgress && <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )}
              </div>

              {/* Sticky action buttons — pinned above safe area */}
              <div
                className="flex flex-col gap-3 px-5 pt-2 shrink-0"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
              >
                <AnimatePresence mode="wait">
                  {confirmRemove ? (
                    <motion.div
                      key="confirm"
                      className="rounded-2xl p-4 flex flex-col gap-3"
                      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <p className="text-sm font-semibold text-center" style={{ color: "#ef4444", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Remove this reward?</p>
                      <p className="text-xs text-muted-foreground text-center" style={{ fontFamily: "'Inter', sans-serif" }}>All progress and available rewards will be cleared.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmRemove(false)}
                          disabled={isSaving}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold"
                          style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={doRemoveReward}
                          disabled={isSaving}
                          className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                          style={{ background: "#ef4444", color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isSaving ? 0.7 : 1 }}
                        >
                          {isSaving ? (
                            <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                          ) : null}
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      className="flex flex-col gap-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <button
                        onClick={saveRewardEdit}
                        disabled={isSaving}
                        className="w-full py-4 rounded-2xl font-bold text-sm text-primary-foreground transition-all active:scale-95 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #FF6B2B, #D94F00)", fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: "0 2px 12px rgba(255,107,43,0.35)", opacity: isSaving ? 0.75 : 1 }}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            Saving…
                          </>
                        ) : "Save Reward"}
                      </button>

                      {rewardInterval > 0 && (
                        <button
                          onClick={() => setConfirmRemove(true)}
                          disabled={isSaving}
                          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                          style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", fontFamily: "'Inter', sans-serif" }}
                        >
                          Remove Reward
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
