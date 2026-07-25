import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Bell, BellOff } from "lucide-react";
import { AppDatabase } from "../../types";
import { StreakService } from "../../services/streak";
import { NotificationService } from "../../services/notifications";
import { Toggle } from "../components/Toggle";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { Capacitor } from "@capacitor/core";

export function SettingsTab({
  db,
  updateDb,
  timezone,
  onSignOut,
}: {
  db: AppDatabase;
  updateDb: (db: AppDatabase) => Promise<void>;
  timezone: string;
  onSignOut: () => void;
}) {
  const { settings } = db;
  const streakResult = useMemo(() => StreakService.evaluateStreak(db.streak, db.lastActivityAt, timezone), [db, timezone]);

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
              className="flex gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
              style={{ background: "rgba(107,158,255,0.08)", border: "1px solid rgba(107,158,255,0.2)" }}
              onClick={() => {
                if (Capacitor.getPlatform() !== 'web') {
                  NativeSettings.open({
                    optionAndroid: AndroidSettings.ApplicationDetails,
                    optionIOS: IOSSettings.App
                  }).catch(console.error);
                }
              }}
            >
              <Bell size={14} style={{ color: "#6B9EFF", flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                On Android, go to <strong className="text-foreground">App Info → Notifications</strong> to manage delivery. Honor 400 Pro may require disabling battery optimization for timely alerts.
              </p>
            </div>
          )}
        </div>
      )}

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
    </motion.div>
  );
}
