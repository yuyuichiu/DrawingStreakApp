import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSync } from "../hooks/useSync";
import { useTimezone } from "../hooks/useTimezone";
import { DriveService } from "../services/drive";
import { StreakService } from "../services/streak";
import { NotificationService } from "../services/notifications";
import { Tab } from "../types";
import { FlameIcon } from "./components/FlameIcon";
import { BottomNav } from "./components/BottomNav";
import { HomeTab } from "./tabs/HomeTab";
import { UploadTab } from "./tabs/UploadTab";
import { GalleryTab } from "./tabs/GalleryTab";
import { SettingsTab } from "./tabs/SettingsTab";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const { db, isLoading, updateDb, reload } = useSync();
  const { timezone, saveTimezone } = useTimezone();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    DriveService.getAccessToken()
      .then((token) => {
        if (token) setSignedIn(true);
      })
      .catch(() => setSignedIn(false));
  }, []);

  const handleSignIn = async () => {
    try {
      await DriveService.signIn();
      setSignedIn(true);
      reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    try {
      await DriveService.signOut();
      setSignedIn(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isLoading && signedIn && db && timezone) {
      const todayDone = StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone).status === 'ALREADY_COMPLETED_TODAY';
      NotificationService.requestPermissions().then((granted) => {
        if (granted) {
          NotificationService.scheduleAlerts(timezone, db.settings, todayDone);
        }
      });
    }
  }, [isLoading, signedIn, db, timezone]);

  if (!timezone) {
    return null;
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" style={{ background: "#E8E2D9" }}>
        <div className="bg-card p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center">
          <FlameIcon size={80} lit />
          <h1 className="text-2xl font-extrabold mt-4 mb-2 text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Drawing Streak
          </h1>
          <p className="text-sm text-muted-foreground mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            Connect Google Drive to securely back up your drawings and track your streak.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full py-3 rounded-2xl font-bold text-primary-foreground shadow flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: "var(--primary)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" style={{ background: "#E8E2D9" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  const todayDone = db ? StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone).status === 'ALREADY_COMPLETED_TODAY' : false;

  return (
    <div
      className="min-h-screen flex items-start justify-center"
      style={{ background: "#E8E2D9", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[420px] min-h-screen relative flex flex-col shadow-xl" style={{ background: "var(--background)" }}>
        <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence mode="wait">
            {tab === "home" && (
              <HomeTab key="home" db={db!} timezone={timezone} onUpload={() => setTab("upload")} />
            )}
            {tab === "upload" && (
              <UploadTab
                key="upload"
                db={db!}
                updateDb={updateDb}
                timezone={timezone}
                driveLink={db?.settings.driveFolderLink || ""}
                onComplete={() => setTab("home")}
              />
            )}
            {tab === "gallery" && <GalleryTab key="gallery" drawings={db!.drawings} />}
            {tab === "settings" && (
              <SettingsTab
                key="settings"
                db={db!}
                updateDb={updateDb}
                timezone={timezone}
                onSignOut={handleSignOut}
              />
            )}
          </AnimatePresence>
        </div>
        <BottomNav active={tab} onSelect={setTab} todayDone={todayDone} />
      </div>
    </div>
  );
}
