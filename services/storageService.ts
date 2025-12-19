
import { AppState } from "../types";
import { DEFAULT_CONFIG, DEFAULT_AI_TOOLS } from "../constants";

const KEY = 'live_act_pro_db_v1';

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(KEY);
    const emptyState: AppState = {
      notes: [],
      tasks: [],
      flashcards: [],
      challenges: [],
      journal: [],
      config: DEFAULT_CONFIG
    };

    if (!stored) return emptyState;
    
    const parsed = JSON.parse(stored);

    // --- CONFIGURATION HYDRATION LOGIC ---
    // If the stored config version does not match the hardcoded DEFAULT_CONFIG version,
    // we overwrite the stored config with the code version.
    // This ensures that when the Owner updates constants.ts, all users get the new settings immediately.
    // Use loose comparison to handle undefined/null
    if (parsed.config?._version !== DEFAULT_CONFIG._version) {
        // Force update config from code
        parsed.config = DEFAULT_CONFIG;
    } else {
        // Fallbacks for legacy/local state if versions match (or both undefined)
        if (!parsed.config || !parsed.config.mentors) {
          parsed.config = DEFAULT_CONFIG;
        }
        if (!parsed.config.aiTools) {
          parsed.config.aiTools = DEFAULT_AI_TOOLS;
        }
    }

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

    return parsed;
  } catch (error) {
    console.error("Failed to load state:", error);
    return {
      notes: [],
      tasks: [],
      flashcards: [],
      challenges: [],
      journal: [],
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