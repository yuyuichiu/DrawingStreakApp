import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, X, Palette } from "lucide-react";
import { AppDatabase, Tag } from "../../types";
import { StreakService } from "../../services/streak";
import { NotificationService } from "../../services/notifications";
import { Toggle } from "../components/Toggle";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { Capacitor } from "@capacitor/core";
import { useAppContext } from "../../hooks/AppContext";
import { getTagStyle } from "../utils";

const parseHsl = (color: string) => {
  const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  return match ? { h: parseInt(match[1], 10), s: parseInt(match[2], 10), l: parseInt(match[3], 10) } : { h: 0, s: 70, l: 50 };
};

export function SettingsTab({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const { db: contextDb, updateDb, timezone } = useAppContext();
  const db = contextDb!;
  const { settings } = db;
  const streakResult = useMemo(() => StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone), [db, timezone]);

  const [editTagModal, setEditTagModal] = useState<{ open: boolean, tag?: Tag, newName: string, newColor: string }>({ open: false, newName: "", newColor: "" });
  const [deleteTagModal, setDeleteTagModal] = useState<{ open: boolean, tag?: Tag }>({ open: false });

  const updateSetting = async <K extends keyof AppDatabase['settings']>(key: K, value: AppDatabase['settings'][K]) => {
    if (key === 'notifications' && value === true) {
      const granted = await NotificationService.requestPermissions();
      if (!granted && Capacitor.getPlatform() !== 'web') {
        alert("Notification permissions are required. Please enable them in your device settings.");
        return;
      }
    }
    const newDb = { ...db, settings: { ...db.settings, [key]: value } };
    await updateDb(newDb);
    if (['notifications', 'morningAlert', 'eveningAlert', 'morningTime', 'eveningTime'].includes(key)) {
      if (newDb.settings.notifications) {
        NotificationService.scheduleAlerts(timezone, newDb.settings);
      } else {
        NotificationService.scheduleAlerts(timezone, newDb.settings); // Will cancel all
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="px-5 pt-12 pb-6 flex flex-col gap-6"
    >
      <h1
        className="text-2xl font-extrabold text-foreground"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Settings
      </h1>

      {/* Profile */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          Profile
        </p>
        <div className="rounded-2xl overflow-hidden px-4 py-3.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Display name
          </p>
          <input
            type="text"
            value={settings.userName}
            onChange={(e) => updateSetting('userName', e.target.value)}
            className="w-full text-sm mt-0.5 bg-transparent border-none outline-none"
            style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
            placeholder="Artist"
          />
        </div>
      </div>

      {/* Notifications */}
      {Capacitor.getPlatform() !== 'web' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Streak Alerts
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {/* Master toggle */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,107,43,0.1)" }}>
                {settings.notifications ? (
                  <Bell size={18} style={{ color: "var(--primary)" }} />
                ) : (
                  <BellOff size={18} style={{ color: "var(--muted-foreground)" }} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Push notifications
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Like Duolingo — never miss a day
                </p>
              </div>
              <Toggle on={settings.notifications} onToggle={() => updateSetting('notifications', !settings.notifications)} />
            </div>

            {/* Morning alert */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 transition-opacity"
              style={{
                background: "var(--card)",
                borderBottom: "1px solid var(--border)",
                opacity: settings.notifications ? 1 : 0.4,
                pointerEvents: settings.notifications ? "auto" : "none",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg">
                🌅
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Morning reminder
                </p>
                <input
                  type="time"
                  value={settings.morningTime}
                  onChange={(e) => updateSetting('morningTime', e.target.value)}
                  className="text-xs mt-0.5 bg-transparent border-none outline-none"
                  style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              <Toggle on={settings.morningAlert} onToggle={() => updateSetting('morningAlert', !settings.morningAlert)} />
            </div>

            {/* Evening alert */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 transition-opacity"
              style={{
                background: "var(--card)",
                opacity: settings.notifications ? 1 : 0.4,
                pointerEvents: settings.notifications ? "auto" : "none",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg">
                🌙
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Evening nudge
                </p>
                <input
                  type="time"
                  value={settings.eveningTime}
                  onChange={(e) => updateSetting('eveningTime', e.target.value)}
                  className="text-xs mt-0.5 bg-transparent border-none outline-none"
                  style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              <Toggle on={settings.eveningAlert} onToggle={() => updateSetting('eveningAlert', !settings.eveningAlert)} />
            </div>

            {/* Test Notification */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 transition-opacity cursor-pointer"
              style={{
                background: "var(--card)",
                opacity: settings.notifications ? 1 : 0.4,
                pointerEvents: settings.notifications ? "auto" : "none",
              }}
              onClick={async () => {
                if (!settings.notifications) return;
                const granted = await NotificationService.requestPermissions();
                if (granted) {
                  NotificationService.testNotification();
                  alert("Test notification scheduled! You may need to minimize the app to see it pop up.");
                } else {
                  alert("Notification permissions not granted.");
                }
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg">
                🔔
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Test notification
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Send a test alert now
                </p>
              </div>
            </div>
          </div>
          {settings.notifications && (
            <div
              className="flex flex-col gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: "rgba(107,158,255,0.08)", border: "1px solid rgba(107,158,255,0.2)" }}
            >
              <div className="flex gap-2">
                <Bell size={16} style={{ color: "#6B9EFF", flexShrink: 0, marginTop: 2 }} />
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    To ensure timely alerts on Android:
                  </p>
                  <ul className="text-xs text-muted-foreground leading-relaxed list-disc pl-4 space-y-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <li>Go to <strong className="text-foreground">App Info → Notifications</strong> and allow notifications.</li>
                    <li>Go to <strong className="text-foreground">App Info → Battery</strong> and select <strong>Unrestricted</strong> (or disable battery optimization).</li>
                  </ul>
                </div>
              </div>
              <button
                className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold mt-1 transition-colors"
                style={{ background: "rgba(107,158,255,0.15)", color: "#6B9EFF", border: "1px solid rgba(107,158,255,0.3)" }}
                onClick={() => {
                  if (Capacitor.getPlatform() !== 'web') {
                    NativeSettings.open({
                      optionAndroid: AndroidSettings.ApplicationDetails,
                      optionIOS: IOSSettings.App
                    }).catch(console.error);
                  }
                }}
              >
                Go to App Settings
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Tag Pool
          </p>
          <button 
             onClick={() => {
                const hue = Math.floor(Math.random() * 360);
                setEditTagModal({ open: true, tag: undefined, newName: "", newColor: `hsl(${hue}, 70%, 50%)` });
             }}
             className="text-xs font-semibold text-primary">
            + Add Tag
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
           {(db.definedTags || []).length === 0 ? (
             <p className="px-4 py-3.5 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>No tags defined.</p>
           ) : (
             (db.definedTags || []).map((tag, i) => (
               <div key={tag.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i < (db.definedTags?.length || 0) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="flex-1 overflow-hidden">
                     <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif", ...getTagStyle(tag.color) }}>
                       {tag.name}
                     </span>
                  </div>
                  <button onClick={() => {
                     setEditTagModal({ open: true, tag: tag, newName: tag.name, newColor: tag.color });
                  }} className="text-xs text-muted-foreground p-1">Edit</button>
                  <button onClick={() => {
                     setDeleteTagModal({ open: true, tag: tag });
                  }} className="text-xs text-red-500 p-1">Delete</button>
               </div>
             ))
           )}
        </div>
      </div>

      {/* App info */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          App
        </p>
        {[
          { label: "Current streak", value: `${streakResult.streak} days` },
          { label: "Total drawings", value: `${db.drawings.length}` },
          { label: "Longest streak", value: `${db.longestStreak || 0} days` },
          { label: "Version", value: "1.0.0" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <span className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              {row.label}
            </span>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onSignOut}
        className="w-full py-3 mt-4 rounded-xl text-sm font-semibold transition-colors"
        style={{ color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
      >
        Sign Out
      </button>

      {/* Edit Tag Modal */}
      <AnimatePresence>
        {editTagModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setEditTagModal({ ...editTagModal, open: false })}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {editTagModal.tag ? "Edit Tag" : "New Tag"}
                </h3>
                <button onClick={() => setEditTagModal({ ...editTagModal, open: false })}><X size={20} className="text-muted-foreground" /></button>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tag Name</label>
                <input
                  type="text"
                  value={editTagModal.newName}
                  onChange={(e) => setEditTagModal({ ...editTagModal, newName: e.target.value.toUpperCase() })}
                  placeholder="e.g. SKETCHING"
                  className="w-full bg-secondary text-foreground rounded-2xl py-3 px-4 text-sm font-medium outline-none border border-transparent focus:border-primary/50 transition-colors uppercase"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tag Color</label>
                
                {/* Custom Color Picker UI */}
                <div className="flex gap-4">
                  {/* Large Preview */}
                  <div className="w-16 h-16 rounded-2xl flex-shrink-0 border border-border shadow-sm flex items-center justify-center" style={{ background: editTagModal.newColor }}>
                     <Palette size={20} className="text-white opacity-50 mix-blend-difference" />
                  </div>
                  
                  {/* Sliders */}
                  <div className="flex flex-col gap-3 flex-1 justify-center">
                    {/* Hue */}
                    <div className="relative w-full h-4 rounded-full shadow-inner" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}>
                       <input 
                         type="range" min="0" max="360" value={parseHsl(editTagModal.newColor).h} 
                         onChange={(e) => setEditTagModal({ ...editTagModal, newColor: `hsl(${e.target.value}, ${parseHsl(editTagModal.newColor).s}%, ${parseHsl(editTagModal.newColor).l}%)` })}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                       <div className="absolute top-0 bottom-0 w-4 bg-white shadow-md border border-gray-300 rounded-full pointer-events-none" style={{ left: `calc(${(parseHsl(editTagModal.newColor).h / 360) * 100}% - ${(parseHsl(editTagModal.newColor).h / 360) * 16}px)` }} />
                    </div>

                    {/* Saturation */}
                    <div className="relative w-full h-4 rounded-full shadow-inner" style={{ background: `linear-gradient(to right, hsl(${parseHsl(editTagModal.newColor).h}, 0%, ${parseHsl(editTagModal.newColor).l}%), hsl(${parseHsl(editTagModal.newColor).h}, 100%, ${parseHsl(editTagModal.newColor).l}%))` }}>
                       <input 
                         type="range" min="0" max="100" value={parseHsl(editTagModal.newColor).s} 
                         onChange={(e) => setEditTagModal({ ...editTagModal, newColor: `hsl(${parseHsl(editTagModal.newColor).h}, ${e.target.value}%, ${parseHsl(editTagModal.newColor).l}%)` })}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                       <div className="absolute top-0 bottom-0 w-4 bg-white shadow-md border border-gray-300 rounded-full pointer-events-none" style={{ left: `calc(${(parseHsl(editTagModal.newColor).s / 100) * 100}% - ${(parseHsl(editTagModal.newColor).s / 100) * 16}px)` }} />
                    </div>

                    {/* Lightness */}
                    <div className="relative w-full h-4 rounded-full shadow-inner" style={{ background: `linear-gradient(to right, #000, hsl(${parseHsl(editTagModal.newColor).h}, ${parseHsl(editTagModal.newColor).s}%, 50%), #fff)` }}>
                       <input 
                         type="range" min="0" max="100" value={parseHsl(editTagModal.newColor).l} 
                         onChange={(e) => setEditTagModal({ ...editTagModal, newColor: `hsl(${parseHsl(editTagModal.newColor).h}, ${parseHsl(editTagModal.newColor).s}%, ${e.target.value}%)` })}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                       <div className="absolute top-0 bottom-0 w-4 bg-white shadow-md border border-gray-300 rounded-full pointer-events-none" style={{ left: `calc(${(parseHsl(editTagModal.newColor).l / 100) * 100}% - ${(parseHsl(editTagModal.newColor).l / 100) * 16}px)` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                   <div className="flex-1 relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold uppercase tracking-wider">hsl</span>
                     <input
                       type="text"
                       value={editTagModal.newColor.replace('hsl(', '').replace(')', '')}
                       onChange={(e) => setEditTagModal({ ...editTagModal, newColor: `hsl(${e.target.value})` })}
                       className="w-full bg-secondary text-foreground rounded-xl py-2.5 pl-10 pr-3 text-sm font-medium outline-none border border-transparent focus:border-primary/50 transition-colors"
                       style={{ fontFamily: "'Inter', sans-serif" }}
                     />
                   </div>
                   <button 
                     onClick={() => {
                        const hue = Math.floor(Math.random() * 360);
                        setEditTagModal({ ...editTagModal, newColor: `hsl(${hue}, 70%, 50%)` });
                     }}
                     className="px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
                   >
                     Randomize
                   </button>
                </div>
              </div>
              <button 
                onClick={() => {
                   const name = editTagModal.newName.trim().toUpperCase();
                   if (!name) return;
                   
                   const isDuplicate = (db.definedTags || []).some(t => t.id !== editTagModal.tag?.id && t.name.trim().toUpperCase() === name);
                   if (isDuplicate) {
                      alert(`Tag "${name}" already exists.`);
                      return;
                   }
                   
                   if (editTagModal.tag) {
                      // Rename & color change
                      const tagId = editTagModal.tag.id;
                      const oldName = editTagModal.tag.name;
                      const newTags = (db.definedTags || []).map(t => t.id === tagId ? { ...t, name, color: editTagModal.newColor } : t);
                      
                      const newDrawings = db.drawings.map(d => {
                         if (d.tags?.includes(oldName)) {
                            return { ...d, tags: d.tags.map(t => t === oldName ? name : t) };
                         }
                         return d;
                       });
                      updateDb({ ...db, definedTags: newTags, drawings: newDrawings });
                   } else {
                      // New tag
                      const newTag = { id: crypto.randomUUID(), name, color: editTagModal.newColor };
                      updateDb({ ...db, definedTags: [...(db.definedTags || []), newTag] });
                   }
                   setEditTagModal({ open: false, newName: "", newColor: "" });
                }}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold mt-4"
              >
                Save Tag
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Tag Modal */}
      <AnimatePresence>
        {deleteTagModal.open && deleteTagModal.tag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setDeleteTagModal({ open: false })}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center self-center mb-2">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delete Tag?</h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                Are you sure you want to delete the <strong className="text-foreground">{deleteTagModal.tag.name}</strong> tag?
                <br/>This will remove it from <strong>{db.drawings.filter(d => d.tags?.includes(deleteTagModal.tag!.name)).length}</strong> past drawing(s).
              </p>
              
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setDeleteTagModal({ open: false })}
                  className="flex-1 py-3.5 bg-secondary text-foreground rounded-2xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                     const tagName = deleteTagModal.tag!.name;
                     const newTags = (db.definedTags || []).filter(t => t.id !== deleteTagModal.tag!.id);
                     const newDrawings = (db.drawings || []).map(d => {
                        if (d.tags?.includes(tagName)) {
                           return { ...d, tags: d.tags.filter(t => t !== tagName) };
                        }
                        return d;
                     });
                     updateDb({ ...db, definedTags: newTags, drawings: newDrawings });
                     setDeleteTagModal({ open: false });
                  }}
                  className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-bold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
