import React from "react";
import { motion } from "motion/react";
import { FlameIcon } from "./FlameIcon";

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden" style={{ background: "#FDFBF7", fontFamily: "'Inter', sans-serif" }}>
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <FlameIcon size={32} lit />
          <span className="font-extrabold text-xl tracking-tight text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Drawing Streak App
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="/privacy.html" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Privacy</a>
          <a href="/terms.html" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Terms</a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-5xl mx-auto text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Build your habit today
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>
            Never break your <span className="text-primary relative inline-block">
              drawing streak.
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-accent/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            The minimal, focused tracker for artists. Automatically backup your daily sketches directly to your Google Drive and build a lasting creative habit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onSignIn}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
              style={{ background: "var(--primary)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Get Started with Google
            </button>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-foreground bg-card shadow flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border border-border">
              Learn More
            </a>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          id="features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full"
        >
          <div className="bg-card p-8 rounded-3xl shadow-sm border border-border flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Google Drive Sync</h3>
            <p className="text-muted-foreground text-sm">Your artwork is securely saved directly to your personal Google Drive account. No third-party servers.</p>
          </div>
          <div className="bg-card p-8 rounded-3xl shadow-sm border border-border flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent-foreground mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Maintain the Streak</h3>
            <p className="text-muted-foreground text-sm">Visual tracking and daily reminders help you stay consistent and build an unbreakable artistic habit.</p>
          </div>
          <div className="bg-card p-8 rounded-3xl shadow-sm border border-border flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4CAF82]/10 flex items-center justify-center text-[#4CAF82] mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Personal Gallery</h3>
            <p className="text-muted-foreground text-sm">Watch your progress over time in a beautiful, distraction-free timeline of your past drawings.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border mt-auto py-8 text-center text-sm text-muted-foreground flex flex-col items-center relative z-10 bg-background/80 backdrop-blur-sm">
        <p className="mb-4 sm:mb-2">© {new Date().getFullYear()} Drawing Streak App (drawing-streak-app). All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="/privacy.html" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span>&middot;</span>
          <a href="/terms.html" className="hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};
