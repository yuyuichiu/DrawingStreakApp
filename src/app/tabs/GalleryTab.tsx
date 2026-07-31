import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, BookOpen, X, Calendar } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Drawing } from "../../types";
import { DriveImage } from "../components/DriveImage";
import { useAppContext } from "../../hooks/AppContext";

export function GalleryTab() {
  const { db } = useAppContext();
  const drawings = db!.drawings;
  const [selected, setSelected] = useState<Drawing | null>(null);
  
  const [searchDate, setSearchDate] = useState("");
  const [searchTags, setSearchTags] = useState("");

  const filtered = useMemo(() => {
    return drawings.filter(d => {
      let dateMatch = true;
      if (searchDate) {
        // Assuming d.date is an ISO string like "2026-07-26T..."
        dateMatch = d.date.startsWith(searchDate);
      }
      
      let tagsMatch = true;
      if (searchTags.trim()) {
        const q = searchTags.toLowerCase();
        tagsMatch = d.title.toLowerCase().includes(q) || (d.tags?.some(tag => tag.toLowerCase().includes(q)) ?? false);
      }
      
      return dateMatch && tagsMatch;
    });
  }, [drawings, searchDate, searchTags]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-28 flex flex-col gap-5"
    >
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          {filtered.length} drawings
        </p>
        <h1
          className="text-2xl font-extrabold text-foreground mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Your gallery
        </h1>
      </div>

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
          <p className="text-sm mt-4 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>No drawings found.</p>
        </div>
      ) : (
        <ResponsiveMasonry columnsCountBreakPoints={{ 100: 2, 600: 3, 900: 4 }}>
          <Masonry gutter="12px">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="rounded-2xl overflow-hidden relative group w-full text-left"
                style={{
                  background: "var(--secondary)",
                  aspectRatio: item.tall ? "3/4" : "4/4",
                  display: "block"
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
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map(t => (
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
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: "rgba(22,18,13,0.92)" }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full h-full flex flex-col justify-center items-center pointer-events-none"
            >
              <div 
                className="w-full h-full flex items-center justify-center pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={5}
                  centerOnInit
                  wheel={{ step: 0.1 }}
                >
                  <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <DriveImage
                      fileId={selected.id}
                      fallbackUrl={selected.url}
                      alt={selected.title}
                      className="max-w-[95vw] max-h-[80vh] rounded-2xl object-contain"
                    />
                  </TransformComponent>
                </TransformWrapper>
              </div>

              {/* Floating footer */}
              <div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col gap-2 p-4 rounded-3xl"
                style={{ background: "rgba(22,18,13,0.85)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", minWidth: "85vw", maxWidth: "400px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-2">
                  <div>
                    <p className="font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {selected.title}
                    </p>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {new Date(selected.date).toLocaleDateString()}
                    </p>
                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {selected.tags.map(t => (
                          <span key={t} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--secondary)" }}
                  >
                    <X size={18} color="var(--foreground)" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
