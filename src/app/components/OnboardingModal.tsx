import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "lucide-react";

export function OnboardingModal({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #FF6B2B, #FFB347)" }} />
        
        <div className="flex flex-col items-center gap-3 text-center mt-2">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,107,43,0.12)" }}>
            <User size={32} style={{ color: "var(--primary)" }} />
          </div>
          <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome!
          </h2>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            How should we call you?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl outline-none transition-all text-center text-lg font-medium"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl font-bold text-primary-foreground transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Continue
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
