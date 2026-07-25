import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, BookOpen, X } from "lucide-react";
import { Drawing } from "../../types";
import { DriveImage } from "../components/DriveImage";
import { useAppContext } from "../../hooks/AppContext";

export function GalleryTab() {
  const { db } = useAppContext();
  const drawings = db!.drawings;
  const [selected, setSelected] = useState<Drawing | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return drawings;
    const q = search.toLowerCase();
    return drawings.filter(d => {
      if (d.date.includes(q)) return true;
      if (d.title.toLowerCase().includes(q)) return true;
      if (d.tags?.some(tag => tag.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [drawings, search]);

  const left = filtered.filter((_, i) => i % 2 === 0);
  const right = filtered.filter((_, i) => i % 2 !== 0);

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
          {filtered.length} drawings
        </p>
        <h1
          className="text-2xl font-extrabold text-foreground mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Your gallery
        </h1>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search by date (YYYY-MM-DD) or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary text-foreground rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none border border-transparent focus:border-primary/50 transition-colors"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 opacity-50">
          <BookOpen size={48} />
          <p className="text-sm mt-4 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>No drawings found.</p>
        </div>
      ) : (
        <div className="flex gap-3">
          {[left, right].map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-3">
              {col.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="rounded-2xl overflow-hidden relative group"
                  style={{
                    background: "var(--secondary)",
                    aspectRatio: item.tall ? "3/4" : "4/4",
                  }}
                >
                  <DriveImage
                    fileId={item.id}
                    fallbackUrl={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3"
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
            </div>
          ))}
        </div>
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
              className="w-[90vw] max-w-[360px] flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <DriveImage
                fileId={selected.id}
                fallbackUrl={selected.url}
                alt={selected.title}
                className="w-full rounded-2xl object-cover"
                style={{ maxHeight: "60vh" }}
              />
              <div className="flex items-center justify-between px-1">
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
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "var(--secondary)" }}
                >
                  <X size={16} color="var(--foreground)" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
