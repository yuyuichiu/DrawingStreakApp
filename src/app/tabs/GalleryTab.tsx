import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, BookOpen, X, Calendar, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import { Drawing } from "../../types";
import { DriveImage } from "../components/DriveImage";
import { useAppContext } from "../../hooks/AppContext";
import { StreakService } from "../../services/streak";

const MAX_DOTS = 7;
const DISMISS_THRESHOLD = 120;

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0 }),
};

export function GalleryTab() {
  const { db, timezone } = useAppContext();
  const drawings = db!.drawings;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchDate, setSearchDate] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [direction, setDirection] = useState(0);
  const [dragY, setDragY] = useState(0);

  const scaleRef = useRef(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasMultiTouchRef = useRef(false);
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const gestureModeRef = useRef<"h" | "v" | null>(null);
  const draggingRef = useRef(false);
  const dragYRef = useRef(0);

  const streakDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...drawings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentStreak = 0;
    let lastActivityAt: string | null = null;
    let lastDayStr: string | null = null;

    for (const d of sorted) {
      const dDate = new Date(d.date);
      const dayStr = StreakService.getStreakDay(dDate, timezone);

      if (dayStr !== lastDayStr) {
        const result = StreakService.evaluateStreak(currentStreak, lastActivityAt, timezone, dDate);
        if (result.status === 'READY_TO_CONTINUE' || result.status === 'NO_ACTIVITY' || result.status === 'PAUSED') {
          currentStreak = (result.streak === 0 && result.status !== 'NO_ACTIVITY') ? 1 : result.streak + 1;
        } else if (result.status === 'RESET') {
          currentStreak = 1;
        }
        lastActivityAt = d.date;
        lastDayStr = dayStr;
      }
      map.set(d.id, currentStreak);
    }
    return map;
  }, [drawings, timezone]);

  const filtered = useMemo(() => {
    return drawings.filter((d) => {
      const dateMatch = !searchDate || d.date.startsWith(searchDate);
      const q = searchTags.toLowerCase().trim();
      const tagsMatch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false);
      return dateMatch && tagsMatch;
    });
  }, [drawings, searchDate, searchTags]);

  const selected = selectedIndex !== null ? filtered[selectedIndex] ?? null : null;

  const close = useCallback(() => {
    setSelectedIndex(null);
    setZoomed(false);
    setDragY(0);
    scaleRef.current = 1;
    draggingRef.current = false;
    dragYRef.current = 0;
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= filtered.length) return;
      setDirection(i > (selectedIndex ?? 0) ? 1 : -1);
      setSelectedIndex(i);
      setZoomed(false);
      scaleRef.current = 1;
    },
    [filtered.length, selectedIndex],
  );

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < filtered.length - 1)
      goTo(selectedIndex + 1);
  }, [goTo, selectedIndex, filtered.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) goTo(selectedIndex - 1);
  }, [goTo, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, goNext, goPrev, close]);

  // Desktop hint auto-hide
  const lightboxOpen = selectedIndex !== null;
  useEffect(() => {
    if (!lightboxOpen) {
      setHintVisible(false);
      return;
    }
    if (window.matchMedia("(pointer: fine)").matches) {
      setHintVisible(true);
      const t = setTimeout(() => setHintVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lightboxOpen]);

  // Touch: start
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      wasMultiTouchRef.current = false;
      gestureModeRef.current = null;
    } else {
      wasMultiTouchRef.current = true;
    }
  }, []);

  // Touch: move — interactive drag-to-dismiss
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      wasMultiTouchRef.current = true;
      return;
    }
    if (!touchStartRef.current || wasMultiTouchRef.current || scaleRef.current > 1.05) return;

    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    // Lock gesture direction on first significant movement
    if (!gestureModeRef.current) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.3) {
        gestureModeRef.current = "v";
      } else if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        gestureModeRef.current = "h";
      }
    }

    // Vertical drag: image follows finger downward
    if (gestureModeRef.current === "v" && dy > 0) {
      draggingRef.current = true;
      dragYRef.current = dy;
      setDragY(dy);
    }
  }, []);

  // Touch: end — resolve gesture
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const mode = gestureModeRef.current;
      gestureModeRef.current = null;

      // Resolve vertical drag-to-dismiss
      if (draggingRef.current) {
        const finalY = dragYRef.current;
        draggingRef.current = false;
        dragYRef.current = 0;
        if (finalY > DISMISS_THRESHOLD) {
          close();
        } else {
          setDragY(0); // snap back
        }
        touchStartRef.current = null;
        return;
      }

      // Resolve horizontal swipe
      if (!touchStartRef.current || wasMultiTouchRef.current || scaleRef.current > 1.05) {
        touchStartRef.current = null;
        return;
      }
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      touchStartRef.current = null;

      if (mode === "h" && Math.abs(dx) > 60) {
        dx < 0 ? goNext() : goPrev();
      }
    },
    [goNext, goPrev, close],
  );

  // Drag progress (0 to 1)
  const dragProgress = Math.min(dragY / 300, 1);

  // Dot indicator sliding window
  const dotRange = useMemo(() => {
    const len = filtered.length;
    if (len <= MAX_DOTS) return { start: 0, count: len };
    const half = Math.floor(MAX_DOTS / 2);
    let start = Math.max(0, (selectedIndex ?? 0) - half);
    if (start + MAX_DOTS > len) start = len - MAX_DOTS;
    return { start, count: MAX_DOTS };
  }, [filtered.length, selectedIndex]);

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-28 flex flex-col gap-5"
    >
      {/* Header */}
      <div>
        <p
          className="text-xs font-medium tracking-widest uppercase text-muted-foreground"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {filtered.length} drawings
        </p>
        <h1
          className="text-2xl font-extrabold text-foreground mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Your gallery
        </h1>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="w-full bg-secondary text-foreground rounded-2xl py-3 pl-10 pr-3 text-sm font-medium outline-none border border-transparent focus:border-primary/50 transition-colors appearance-none min-h-[46px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <div className="relative flex-[1.5]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            className="w-full bg-secondary text-foreground rounded-2xl py-3 pl-10 pr-3 text-sm font-medium outline-none border border-transparent focus:border-primary/50 transition-colors min-h-[46px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
        </div>
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 opacity-50">
          <BookOpen size={48} />
          <p className="text-sm mt-4 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
            No drawings found.
          </p>
        </div>
      ) : (
        <ResponsiveMasonry columnsCountBreakPoints={{ 100: 2 }}>
          <Masonry gutter="12px">
            {filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  setDirection(0);
                  setSelectedIndex(index);
                }}
                className="rounded-2xl overflow-hidden relative group w-full text-left"
                style={{
                  background: "var(--secondary)",
                  aspectRatio: item.tall ? "3/4" : "4/4",
                  display: "block",
                }}
              >
                <DriveImage
                  fileId={item.id}
                  fallbackUrl={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(22,18,13,0.85) 0%, transparent 60%)" }}
                >
                  <p className="text-xs font-semibold text-foreground leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.date))} - Day {streakDaysMap.get(item.id)}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((t) => (
                        <span key={t} className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded-sm" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </Masonry>
        </ResponsiveMasonry>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ background: `rgba(22,18,13,${0.95 - dragProgress * 0.4})` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Desktop keyboard hint */}
            <AnimatePresence>
              {hintVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-xs"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← → navigate · scroll to zoom · Esc close
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset zoom pill */}
            <AnimatePresence>
              {zoomed && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => transformRef.current?.resetTransform()}
                  className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <RotateCcw size={12} /> Reset zoom
                </motion.button>
              )}
            </AnimatePresence>

            {/* Image area — follows finger on drag-to-dismiss */}
            <div
              className="flex-1 relative overflow-hidden flex items-center justify-center"
              style={{
                transform: `translateY(${dragY}px) scale(${1 - dragProgress * 0.08})`,
                opacity: 1 - dragProgress * 0.4,
                transition: dragY > 0 ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              {/* Desktop prev button */}
              {isDesktop && selectedIndex > 0 && (
                <button
                  onClick={goPrev}
                  className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-40 hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", color: "#fff" }}
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={selectedIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <TransformWrapper
                    ref={transformRef}
                    initialScale={1}
                    minScale={1}
                    maxScale={5}
                    centerOnInit
                    smooth={true}
                    wheel={{ step: 0.005 }}
                    zoomAnimation={{ animationTime: 150, size: 0.1 }}
                    onTransform={(_ref, state) => {
                      scaleRef.current = state.scale;
                      // Only update state if crossing the threshold to avoid re-renders during continuous scrolling
                      if (state.scale > 1.05 && !zoomed) setZoomed(true);
                      else if (state.scale <= 1.05 && zoomed) setZoomed(false);
                    }}
                  >
                    <TransformComponent
                      wrapperStyle={{ width: "100%", height: "100%" }}
                      contentStyle={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DriveImage
                        fileId={selected.id}
                        fallbackUrl={selected.url}
                        alt={selected.title}
                        className="max-w-[95vw] max-h-[80vh] rounded-2xl object-contain"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </motion.div>
              </AnimatePresence>

              {/* Desktop next button */}
              {isDesktop && selectedIndex < filtered.length - 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-40 hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", color: "#fff" }}
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Info panel */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col gap-2 p-4 rounded-3xl"
              style={{
                background: "rgba(22,18,13,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
                minWidth: "85vw",
                maxWidth: "400px",
                transform: `translateY(${dragY * 0.3}px)`,
                opacity: 1 - dragProgress * 0.6,
                transition: dragY > 0 ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              <div className="flex items-center justify-between px-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-white truncate"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {selected.title}
                  </p>
                  <p
                    className="text-xs text-white/70"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selected.date))} - Day {streakDaysMap.get(selected.id)}
                  </p>
                </div>
                <button
                  onClick={close}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <X size={18} color="#fff" />
                </button>
              </div>

              {/* Tags - horizontal scroll */}
              {selected.tags && selected.tags.length > 0 && (
                <div
                  className="flex gap-1.5 overflow-x-auto px-2"
                  style={{ scrollbarWidth: "none" }}
                >
                  {selected.tags.map((t) => (
                    <span
                      key={t}
                      className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Dot indicator */}
              {filtered.length > 1 && (
                <div className="flex justify-center gap-1.5 pt-1">
                  {Array.from({ length: dotRange.count }).map((_, i) => {
                    const idx = dotRange.start + i;
                    const active = idx === selectedIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => goTo(idx)}
                        className="rounded-full transition-all duration-200 cursor-pointer"
                        style={{
                          width: active ? 8 : 6,
                          height: active ? 8 : 6,
                          background: active ? "#fff" : "rgba(255,255,255,0.35)",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
