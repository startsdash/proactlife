import { AppState } from "../types";
import { DEFAULT_CONFIG } from "../constants";

const KEY = 'live_act_pro_db_v1';

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(KEY);
    const emptyState: AppState = {
      notes: [],
      tasks: [],
      habits: [],
      flashcards: [],
      challenges: [],
      journal: [],
      mentorAnalyses: [],
      config: DEFAULT_CONFIG
    };

    if (!stored) return emptyState;
    
    const parsed = JSON.parse(stored);

    // --- CONFIGURATION HYDRATION STRATEGY: CODE-FIRST ---
    // The code in `constants.ts` (DEFAULT_CONFIG) is the Single Source of Truth for structure.
    // If the version in code is different from the version in storage, we BLOW AWAY the stored config
    // and replace it with the code config. This prevents "ghost" items and duplication.
    
    // Check if config exists or version mismatch
    if (!parsed.config || parsed.config._version !== DEFAULT_CONFIG._version) {
        console.log(`Config Version Mismatch or Missing. Hydrating from constants.ts (v${DEFAULT_CONFIG._version})`);
        // Hard Reset of Configuration
        parsed.config = DEFAULT_CONFIG;
    } 
    // If versions match, we trust the LocalStorage (allows for local dev testing without re-pasting constantly),
    // BUT in a production deployment, you typically bump the version in constants.ts, forcing a refresh for everyone.

    // Migration: Notes status and TAGS
    if (parsed.notes) {
      parsed.notes = parsed.notes.map((n: any) => ({
        ...n,
        status: n.status || (n.isProcessed ? 'archived' : 'inbox'),
        tags: Array.isArray(n.tags) ? n.tags : [] // Ensure tags is always an array
      }));
    }

    // Migration: Journal
    if (!parsed.journal) {
      parsed.journal = [];
    }
    
    // Migration: Mentor Analyses
    if (!parsed.mentorAnalyses) {
      parsed.mentorAnalyses = [];
    }
    
    // Migration: Habits
    if (!parsed.habits) {
      parsed.habits = [];
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load state:", error);
    return {
      notes: [],
      tasks: [],
      habits: [],
      flashcards: [],
      challenges: [],
      journal: [],
      mentorAnalyses: [],
      config: DEFAULT_CONFIG
    };
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state:", error);
  }
};