import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../hooks/AppContext";
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
import { LandingPage } from "./components/LandingPage";
import { LoadingScreen } from "./components/LoadingScreen";
import { OnboardingModal } from "./components/OnboardingModal";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const { db, isLoading, reload, updateDb, timezone } = useAppContext();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    DriveService.getAccessToken()
      .then((token) => {
        if (token) {
          setSignedIn(true);
        }
      })
      .catch(() => setSignedIn(false));
  }, []);

  const handleSignIn = async () => {
    try {
      await DriveService.signIn();
      await DriveService.getAccessToken();
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
    return <LandingPage onSignIn={handleSignIn} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
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
              <HomeTab key="home" onUpload={() => setTab("upload")} />
            )}
            {tab === "upload" && (
              <UploadTab
                key="upload"
                onComplete={() => setTab("home")}
              />
            )}
            {tab === "gallery" && <GalleryTab key="gallery" />}
            {tab === "settings" && (
              <SettingsTab
                key="settings"
                onSignOut={handleSignOut}
              />
            )}
          </AnimatePresence>
        </div>
        <BottomNav active={tab} onSelect={setTab} todayDone={todayDone} />
        <AnimatePresence>
          {db && !db.settings.userName && (
            <OnboardingModal 
              onSave={(name) => updateDb({ ...db, settings: { ...db.settings, userName: name } })} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
