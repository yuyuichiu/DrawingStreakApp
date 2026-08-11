export interface Drawing {
  id: string;
  date: string; // ISO string of upload time
  url: string;  // Viewable Drive URL
  title: string;
  tall: boolean; // Aspect ratio flag
  tags?: string[];
  supplements?: { id: string, name: string, url: string }[];
}

export type Tab = "home" | "upload" | "gallery" | "settings";

export interface Settings {
  userName: string;
  notifications: boolean;
  morningAlert: boolean;
  eveningAlert: boolean;
  morningTime: string;
  eveningTime: string;
  driveFolderLink?: string;
  rewardInterval?: number;
  rewardDescription?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface AppDatabase {
  streak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  settings: Settings;
  drawings: Drawing[];
  definedTags?: Tag[]; // optional for backward compatability
  updatedAt?: number;
  rewardProgress?: number;
  availableRewards?: number;
}

export const DEFAULT_DB: AppDatabase = {
  streak: 0,
  longestStreak: 0,
  lastActivityAt: null,
  settings: {
    userName: "",
    notifications: true,
    morningAlert: true,
    eveningAlert: true,
    morningTime: "09:00",
    eveningTime: "20:00",
    driveFolderLink: "",
    rewardInterval: 0,
    rewardDescription: ""
  },
  drawings: [],
  definedTags: [],
  updatedAt: Date.now(),
  rewardProgress: 0,
  availableRewards: 0
};
