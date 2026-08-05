import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { ImageIcon, X, Paperclip, Plus, FolderOpen, Upload } from "lucide-react";
import { useAppContext } from "../../hooks/AppContext";
import { AppDatabase, Drawing } from "../../types";
import { DriveService } from "../../services/drive";
import { StreakService } from "../../services/streak";
import { NotificationService } from "../../services/notifications";
import { FlameIcon } from "../components/FlameIcon";
import { DriveImage } from "../components/DriveImage";

export function UploadTab({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { db: contextDb, updateDb, timezone } = useAppContext();
  const db = contextDb!;
  const driveLink = db.settings.driveFolderLink || "";
  const [drawing, setDrawing] = useState<File | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null);
  const [supplements, setSupplements] = useState<File[]>([]);
  const [existingSupplements, setExistingSupplements] = useState<{ id: string, name: string, url: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tags, setTags] = useState("");
  const [initialized, setInitialized] = useState(false);

  const drawingRef = useRef<HTMLInputElement>(null);
  const suppRef = useRef<HTMLInputElement>(null);

  const streakResult = useMemo(() => StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone), [db, timezone]);
  const currentStreak = streakResult.streak;

  const displayStreak = streakResult.status === 'ALREADY_COMPLETED_TODAY' ? currentStreak : currentStreak + 1;

  const existingDrawing = useMemo(() => {
    const todayStr = StreakService.getStreakDay(new Date(), timezone);
    return db.drawings.find(d => StreakService.getStreakDay(new Date(d.date), timezone) === todayStr);
  }, [db.drawings, timezone]);

  useEffect(() => {
    if (streakResult.status === 'ALREADY_COMPLETED_TODAY' && !initialized) {
      if (existingDrawing) {
        setDrawingPreview(existingDrawing.url);
        setTags(existingDrawing.tags?.join(', ') || "");
        setExistingSupplements(existingDrawing.supplements || []);
      }
      setInitialized(true);
    }
  }, [streakResult.status, existingDrawing, initialized]);

  const handleDrawing = (file: File) => {
    setDrawing(file);
    const url = URL.createObjectURL(file);
    setDrawingPreview(url);
  };

  const handleDrawingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleDrawing(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleDrawing(file);
  };

  const handleSuppInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSupplements((p) => {
        const existing = new Set(p.map(f => f.name));
        return [...p, ...newFiles.filter(f => !existing.has(f.name))];
      });
    }
    e.target.value = '';
  };

  const canSubmit = !!drawing || (!!existingDrawing && !!drawingPreview && drawingPreview === existingDrawing.url);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let uploadedUrl = existingDrawing?.url || "";
      let uploadedId = existingDrawing?.id || "";
      let title = existingDrawing?.title || "Drawing";

      if (drawing) {
        const uploaded = await DriveService.uploadDrawing(drawing, drawing.name);
        uploadedUrl = uploaded.url;
        uploadedId = uploaded.id;
        title = drawing.name;
      }

      let finalSupplements = [...existingSupplements];
      if (supplements.length > 0) {
        const suppPromises = supplements.map(s => DriveService.uploadSupplement(s));
        const uploadedSupps = await Promise.all(suppPromises);
        finalSupplements = [...finalSupplements, ...uploadedSupps];
      }

      const newStreak = streakResult.status === 'ALREADY_COMPLETED_TODAY' ? streakResult.streak : streakResult.streak + 1;
      const newLongest = Math.max(db.longestStreak || 0, newStreak);

      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);

      const newDrawing: Drawing = {
        id: uploadedId,
        date: existingDrawing?.date || new Date().toISOString(),
        url: uploadedUrl,
        title: title,
        tall: false, // simplified
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        supplements: finalSupplements.length > 0 ? finalSupplements : undefined
      };

      let newDrawings = [...db.drawings];
      if (streakResult.status === 'ALREADY_COMPLETED_TODAY') {
        const todayStr = StreakService.getStreakDay(new Date(), timezone);
        const index = newDrawings.findIndex(d => StreakService.getStreakDay(new Date(d.date), timezone) === todayStr);
        if (index !== -1) {
          newDrawings[index] = newDrawing;
        } else {
          newDrawings.unshift(newDrawing);
        }
      } else {
        newDrawings.unshift(newDrawing);
      }

      let newRewardProgress = db.rewardProgress || 0;
      let newAvailableRewards = db.availableRewards || 0;

      if (streakResult.status !== 'ALREADY_COMPLETED_TODAY') {
         if (db.settings.rewardInterval && db.settings.rewardInterval > 0) {
            newRewardProgress += 1;
            if (newRewardProgress >= db.settings.rewardInterval) {
               newAvailableRewards += 1;
               newRewardProgress = 0;
            }
         }
      }

      const newDb: AppDatabase = {
        ...db,
        streak: newStreak,
        longestStreak: newLongest,
        lastActivityAt: new Date().toISOString(),
        drawings: newDrawings,
        rewardProgress: newRewardProgress,
        availableRewards: newAvailableRewards
      };

      await updateDb(newDb);
      NotificationService.scheduleAlerts(timezone, newDb.settings, true);

      setSubmitting(false);
      setDone(true);
      setTimeout(() => {
        onComplete();
      }, 1800);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      alert("Failed to upload drawing. Check console.");
    }
  };

  if (submitting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[60] flex flex-col items-center justify-center gap-4 px-8"
        style={{ background: "var(--background)" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#FF6B2B]/30 border-t-[#FF6B2B] rounded-full"
        />
        <h2 className="text-xl font-bold text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Uploading drawing...
        </h2>
        <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
          Saving securely to your Google Drive. This may take a moment.
        </p>
      </motion.div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[60] flex flex-col items-center justify-center gap-4 px-8"
        style={{ background: "var(--background)" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <FlameIcon size={96} lit />
        </motion.div>
        <h2
          className="text-3xl font-extrabold text-foreground text-center"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Streak kept! 🎉
        </h2>
        <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
          Day {streakResult.status === 'ALREADY_COMPLETED_TODAY' ? currentStreak : currentStreak + 1} complete. Your drawing has been saved.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-6 flex flex-col gap-5"
    >
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          Day {displayStreak}
        </p>
        <h1
          className="text-2xl font-extrabold text-foreground mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {streakResult.status === 'ALREADY_COMPLETED_TODAY' ? 'Update today\'s drawing' : 'Upload today\'s drawing'}
        </h1>
      </div>

      {/* Drawing upload */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Drawing
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(255,107,43,0.15)", color: "var(--primary)", fontFamily: "'Inter', sans-serif" }}
          >
            Required
          </span>
        </div>
        <input
          ref={drawingRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleDrawingInput}
          disabled={submitting}
        />
        {drawingPreview ? (
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]" style={{ background: "var(--secondary)" }}>
            {drawingPreview.startsWith('blob:') ? (
              <img src={drawingPreview} alt="Your drawing" className="w-full h-full object-cover" />
            ) : existingDrawing ? (
              <DriveImage fileId={existingDrawing.id} alt="Your drawing" className="w-full h-full object-cover" />
            ) : null}
            <button
              onClick={() => { setDrawing(null); setDrawingPreview(null); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(22,18,13,0.7)" }}
            >
              <X size={14} color="#F2E8D9" />
            </button>
            <div
              className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "rgba(22,18,13,0.7)", color: "#F2E8D9", fontFamily: "'Inter', sans-serif" }}
            >
              {drawing?.name || existingDrawing?.title || "Drawing"}
            </div>
          </div>
        ) : (
          <button
            onClick={() => !submitting && drawingRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-all duration-200"
            style={{
              background: dragOver ? "rgba(255,107,43,0.06)" : "var(--card)",
              borderColor: dragOver ? "var(--primary)" : "rgba(242,232,217,0.15)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,107,43,0.1)" }}
            >
              <ImageIcon size={26} style={{ color: "var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Tap to upload
              </p>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                JPEG, PNG, HEIC — any photo format
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Supplementary files */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Supplementary files
          <span className="text-xs font-normal text-muted-foreground ml-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            optional
          </span>
        </span>
        <input ref={suppRef} type="file" multiple className="hidden" onChange={handleSuppInput} />
        {(supplements.length > 0 || existingSupplements.length > 0) && (
          <div className="flex flex-col gap-1.5">
            {existingSupplements.map((s, i) => (
              <div
                key={`existing-${i}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Paperclip size={14} style={{ color: "var(--muted-foreground)" }} />
                <span className="text-xs text-foreground flex-1 truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{s.name}</span>
                <button onClick={() => setExistingSupplements((p) => p.filter((_, j) => j !== i))}>
                  <X size={14} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
            ))}
            {supplements.map((f, i) => (
              <div
                key={`new-${i}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Paperclip size={14} style={{ color: "var(--muted-foreground)" }} />
                <span className="text-xs text-foreground flex-1 truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{f.name}</span>
                <button onClick={() => setSupplements((p) => p.filter((_, j) => j !== i))}>
                  <X size={14} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => suppRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-colors"
          style={{ borderColor: "rgba(242,232,217,0.15)", background: "var(--card)" }}
        >
          <Plus size={16} style={{ color: "var(--muted-foreground)" }} />
          <span className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Add files (any format)
          </span>
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Tags
          <span className="text-xs font-normal text-muted-foreground ml-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            comma separated
          </span>
        </span>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. anatomy, digital, sketch"
          className="px-3 py-2.5 rounded-xl border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Drive destination */}
      {driveLink && (
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(76,175,130,0.08)", border: "1px solid rgba(76,175,130,0.2)" }}
        >
          <FolderOpen size={16} style={{ color: "#4CAF82" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "#4CAF82", fontFamily: "'Inter', sans-serif" }}>
              Saving to Google Drive
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
              {driveLink}
            </p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full py-4 rounded-2xl font-bold text-base text-primary-foreground transition-all duration-200 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{
          background: canSubmit ? "linear-gradient(135deg, #FF6B2B, #D94F00)" : "var(--muted)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: canSubmit ? "0 4px 24px rgba(255,107,43,0.35)" : "none",
        }}
      >
        {submitting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          />
        ) : (
          <>
            <Upload size={18} />
            Complete today&apos;s streak
          </>
        )}
      </button>
    </motion.div>
  );
}
