
import { AppState } from "../types";
import { DEFAULT_CONFIG } from "../constants";

const KEY = 'live_act_pro_db_v1';

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(KEY);
    const emptyState: AppState = {
      notes: [],
      tasks: [],
      flashcards: [],
      habits: [], // NEW
      challenges: [],
      journal: [],
      mentorAnalyses: [],
      config: DEFAULT_CONFIG
    };

    if (!stored) return emptyState;
    
    const parsed = JSON.parse(stored);

    // --- CONFIGURATION HYDRATION STRATEGY: CODE-FIRST ---
    if (!parsed.config || parsed.config._version !== DEFAULT_CONFIG._version) {
        console.log(`Config Version Mismatch or Missing. Hydrating from constants.ts (v${DEFAULT_CONFIG._version})`);
        parsed.config = DEFAULT_CONFIG;
    } 

    // Migrations
    if (parsed.notes) {
      parsed.notes = parsed.notes.map((n: any) => ({
        ...n,
        status: n.status || (n.isProcessed ? 'archived' : 'inbox'),
        tags: Array.isArray(n.tags) ? n.tags : []
      }));
    }

    if (!parsed.journal) parsed.journal = [];
    if (!parsed.mentorAnalyses) parsed.mentorAnalyses = [];
    if (!parsed.habits) parsed.habits = []; // Migration for existing users

    return { ...emptyState, ...parsed };
  } catch (error) {
    console.error("Failed to load state:", error);
    return {
      notes: [],
      tasks: [],
      flashcards: [],
      habits: [],
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
