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
import { getTagStyle } from "../utils";

const MAX_DOTS = 7;
const DISMISS_THRESHOLD = 120;

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0 }),
};

export function GalleryTab() {
  const { db, updateDb, timezone } = useAppContext();
  const drawings = db!.drawings;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchDate, setSearchDate] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editTagsOpen, setEditTagsOpen] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [direction, setDirection] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);

  const scaleRef = useRef(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasMultiTouchRef = useRef(false);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const gestureModeRef = useRef<"h" | "v" | null>(null);
  const draggingRef = useRef(false);
  const dragYRef = useRef(0);
  const supplementsRef = useRef<HTMLDivElement>(null);

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

  const imageSupplements = useMemo(() => {
    if (!selected || !selected.supplements) return [];
    return selected.supplements.filter(s => /\.(jpeg|jpg|png|webp|heic|gif)$/i.test(s.name));
  }, [selected]);

  const allMedia = useMemo(() => {
    if (!selected) return [];
    return [
      { id: selected.id, url: selected.url, alt: selected.title },
      ...imageSupplements.map(s => ({ id: s.id, url: s.url, alt: s.name }))
    ];
  }, [selected, imageSupplements]);

  const close = useCallback(() => {
    setSelectedIndex(null);
    setZoomed(false);
    setDragY(0);
    setActiveMediaIndex(0);
    setUiVisible(true);
    setEditTagsOpen(false);
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
      setActiveMediaIndex(0);
      setUiVisible(true);
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
      const dy = touch.clientY - touchStartRef.current.y;
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
        {/* Filter Button */}
        <button 
          className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground rounded-2xl py-3 text-sm font-medium min-h-[46px]"
          onClick={() => setFilterOpen(true)}
        >
          <Search size={16} /> Filters {searchDate || searchTags ? '(Active)' : ''}
        </button>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/60 z-50"
               onClick={() => setFilterOpen(false)}
            />
            <motion.div
               initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 p-6 pb-28 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
               style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.2)" }}
            >
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Filters</h3>
                 <button onClick={() => { setSearchDate(""); setSearchTags(""); }} className="text-sm text-primary font-medium">Clear</button>
               </div>
               
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                 <div className="relative">
                   <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                     type="date"
                     value={searchDate}
                     onChange={(e) => setSearchDate(e.target.value)}
                     className="w-full bg-secondary text-foreground rounded-2xl py-3 pl-10 pr-3 text-sm font-medium outline-none"
                     style={{ fontFamily: "'Inter', sans-serif" }}
                   />
                 </div>
               </div>
               
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-semibold text-muted-foreground uppercase">Tags</label>
                 <div className="relative">
                   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                     type="text"
                     placeholder="Search tags..."
                     value={searchTags}
                     onChange={(e) => setSearchTags(e.target.value)}
                     className="w-full bg-secondary text-foreground rounded-2xl py-3 pl-10 pr-3 text-sm font-medium outline-none"
                     style={{ fontFamily: "'Inter', sans-serif" }}
                   />
                 </div>
                 {/* Tag quick-select chips */}
                 {db.definedTags && db.definedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {db.definedTags.map(tag => (
                         <button 
                           key={tag.id}
                           onClick={() => {
                             if (searchTags.includes(tag.name)) {
                                setSearchTags(searchTags.replace(tag.name, "").trim());
                             } else {
                                setSearchTags((searchTags + " " + tag.name).trim());
                             }
                           }}
                           className="px-2 py-0.5 rounded text-xs font-bold transition-opacity"
                           style={{ 
                             ...getTagStyle(tag.color),
                             opacity: searchTags.includes(tag.name) ? 1 : 0.4
                           }}
                         >
                           {tag.name}
                         </button>
                      ))}
                    </div>
                 )}
               </div>

               <button onClick={() => setFilterOpen(false)} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold mt-2">
                 View {filtered.length} drawings
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                  <p className="text-xs font-semibold text-white leading-tight drop-shadow-md" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(StreakService.getStreakDay(new Date(item.date), timezone)))} - Day {streakDaysMap.get(item.id)}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((t) => {
                         const defined = db.definedTags?.find(tag => tag.name === t);
                         const tagColor = defined?.color || 'var(--primary)';
                         return (
                           <span key={t} className="text-[8px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-sm" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${tagColor}`, color: tagColor }}>
                             {t}
                           </span>
                         );
                      })}
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
              className="flex-1 relative overflow-hidden flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG' || (e.target as HTMLElement).className.includes('react-transform-component')) {
                  setUiVisible(v => !v);
                }
              }}
              style={{
                transform: `translateY(${dragY}px) scale(${1 - dragProgress * 0.08})`,
                opacity: 1 - dragProgress * 0.4,
                transition: dragY > 0 ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              {/* Desktop prev button */}
              {isDesktop && selectedIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-40 hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", color: "#fff", opacity: uiVisible ? undefined : 0, pointerEvents: uiVisible ? 'auto' : 'none' }}
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
                    {(utils) => {
                      transformRef.current = utils;
                      return (
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
                          {allMedia.map((media, idx) => (
                            <DriveImage
                              key={media.id}
                              fileId={media.id}
                              fallbackUrl={media.url}
                              alt={media.alt}
                              className="max-w-[95vw] max-h-[80vh] rounded-2xl object-contain"
                              style={{ display: activeMediaIndex === idx ? 'block' : 'none' }}
                              loaderType="spinner"
                              preload={true}
                            />
                          ))}
                        </TransformComponent>
                      );
                    }}
                  </TransformWrapper>
                </motion.div>
              </AnimatePresence>

              {/* Desktop next button */}
              {isDesktop && selectedIndex < filtered.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-40 hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", color: "#fff", opacity: uiVisible ? undefined : 0, pointerEvents: uiVisible ? 'auto' : 'none' }}
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
                opacity: uiVisible ? 1 - dragProgress * 0.6 : 0,
                pointerEvents: uiVisible ? "auto" : "none",
                transition: dragY > 0 ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              <div className="flex items-center justify-between px-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-white truncate"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(StreakService.getStreakDay(new Date(selected.date), timezone)))} - Day {streakDaysMap.get(selected.id)}
                  </p>
                  <p
                    className="text-xs text-white/70 truncate"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {activeMediaIndex === 0 ? selected.title : imageSupplements[activeMediaIndex - 1]?.name || selected.title}
                  </p>
                </div>
                <button
                  onClick={close}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-red-500/40"
                  style={{ background: "rgba(239, 68, 68, 0.2)" }}
                >
                  <X size={18} color="#fca5a5" />
                </button>
              </div>

              {/* Supplements Tab Row */}
              {imageSupplements.length > 0 && (
                <div 
                  ref={supplementsRef}
                  className="flex gap-2 overflow-x-auto px-2 py-1" 
                  style={{ scrollbarWidth: "none" }}
                  onTouchStart={(e) => {
                    const el = supplementsRef.current;
                    if (el && el.scrollWidth > el.clientWidth + 1) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <button
                    onClick={() => {
                      setActiveMediaIndex(0);
                      transformRef.current?.resetTransform();
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      activeMediaIndex === 0
                        ? "bg-white text-black"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Main
                  </button>
                  {imageSupplements.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveMediaIndex(idx + 1);
                        transformRef.current?.resetTransform();
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        activeMediaIndex === idx + 1
                          ? "bg-white text-black"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              )}

              {/* Tags - horizontal scroll with Edit button */}
              <div className="flex gap-2 items-center px-2">
                <div
                  className="flex gap-1.5 overflow-x-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {selected.tags && selected.tags.length > 0 ? selected.tags.map((t) => {
                    const defined = db.definedTags?.find(tag => tag.name === t);
                    const tagColor = defined?.color || 'var(--primary)';
                    return (
                      <span
                        key={t}
                        className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                        style={{ ...getTagStyle(tagColor) }}
                      >
                        {t}
                      </span>
                    );
                  }) : (
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">No Tags</span>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTags(selected.tags || []);
                    setEditTagsOpen(true);
                  }}
                  className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  Edit
                </button>
              </div>

              {/* Swipe/Pagination indicator */}
              {filtered.length > 1 && (
                <div className="flex items-center justify-center gap-4 pt-2 pb-1 border-t border-white/10 mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="text-white/50 hover:text-white transition-colors cursor-pointer p-1"
                    disabled={selectedIndex === 0}
                    style={{ opacity: selectedIndex === 0 ? 0.3 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-[11px] font-bold tracking-widest text-white/70" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {selectedIndex + 1} / {filtered.length}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="text-white/50 hover:text-white transition-colors cursor-pointer p-1"
                    disabled={selectedIndex === filtered.length - 1}
                    style={{ opacity: selectedIndex === filtered.length - 1 ? 0.3 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            {/* Edit Tags Modal */}
            <AnimatePresence>
              {editTagsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/60"
                  onClick={() => setEditTagsOpen(false)}
                >
                  <div 
                    className="bg-background w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit Tags</h3>
                      <button onClick={() => setEditTagsOpen(false)}><X size={20} className="text-muted-foreground" /></button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 p-3 rounded-2xl text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "'Inter', sans-serif", minHeight: "52px" }}>
                      {editingTags.map((tag, i) => {
                        const defined = db.definedTags?.find(t => t.name === tag);
                        const tagColor = defined?.color || 'var(--primary)';
                        return (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ ...getTagStyle(tagColor) }}>
                            <span className="text-xs font-bold">{tag}</span>
                            <button onClick={() => setEditingTags(editingTags.filter((_, j) => j !== i))} className="hover:opacity-70 transition-opacity flex items-center justify-center"><X size={12} strokeWidth={3} /></button>
                          </div>
                        );
                      })}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ',') {
                             e.preventDefault();
                             const val = tagInput.trim().toUpperCase();
                             if (val && !editingTags.includes(val)) {
                                setEditingTags([...editingTags, val]);
                                if (!db.definedTags?.some(t => t.name.trim().toUpperCase() === val)) {
                                   const hue = Math.floor(Math.random() * 360);
                                   const newTag = { id: crypto.randomUUID(), name: val, color: `hsl(${hue}, 70%, 50%)` };
                                   updateDb({ ...db, definedTags: [...(db.definedTags || []), newTag] });
                                }
                             }
                             setTagInput("");
                           } else if (e.key === 'Backspace' && !tagInput && editingTags.length > 0) {
                             setEditingTags(editingTags.slice(0, -1));
                           }
                        }}
                        placeholder={editingTags.length === 0 ? "Type and press Enter..." : ""}
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground min-w-[120px] ml-1 uppercase"
                      />
                    </div>

                    {(db.definedTags && db.definedTags.filter(t => !editingTags.includes(t.name) && t.name.toLowerCase().includes(tagInput.toLowerCase())).length > 0) || (tagInput.trim() && !db.definedTags?.some(t => t.name.trim().toUpperCase() === tagInput.trim().toUpperCase())) ? (
                      <div className="flex flex-col gap-1.5 mt-1 px-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>Available Tags</span>
                        <div className="flex flex-wrap gap-2">
                          {db.definedTags?.filter(t => !editingTags.includes(t.name) && t.name.toLowerCase().includes(tagInput.toLowerCase())).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setEditingTags([...editingTags, t.name.toUpperCase()]);
                                setTagInput("");
                              }}
                              className="px-2 py-0.5 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                              style={{ ...getTagStyle(t.color) }}
                            >
                              <span>+</span> {t.name}
                            </button>
                          ))}
                          {tagInput.trim() && !db.definedTags?.find(t => t.name === tagInput.trim().toUpperCase()) && (
                             <button
                               onClick={() => {
                                 const val = tagInput.trim().toUpperCase();
                                 setEditingTags([...editingTags, val]);
                                 const hue = Math.floor(Math.random() * 360);
                                 const newTag = { id: crypto.randomUUID(), name: val, color: `hsl(${hue}, 70%, 50%)` };
                                 updateDb({ ...db, definedTags: [...(db.definedTags || []), newTag] });
                                 setTagInput("");
                               }}
                               className="px-2 py-0.5 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                               style={{ background: "transparent", color: "var(--primary)", border: `1px dashed var(--primary)` }}
                             >
                               <span>+</span> Create "{tagInput.trim().toUpperCase()}"
                             </button>
                           )}
                        </div>
                      </div>
                    ) : null}
                    
                    <button 
                      onClick={() => {
                        const newDrawings = db.drawings.map(d => {
                          if (d.id === selected.id) return { ...d, tags: editingTags };
                          return d;
                        });
                        updateDb({ ...db, drawings: newDrawings });
                        setEditTagsOpen(false);
                      }} 
                      className="w-full py-3 mt-2 bg-primary text-primary-foreground rounded-2xl font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
