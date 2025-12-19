
export enum Module {
  NAPKINS = 'napkins',
  SANDBOX = 'sandbox',
  MENTAL_GYM = 'mental_gym',
  KANBAN = 'kanban',
  JOURNAL = 'journal',
  ARCHIVE = 'archive',
  SETTINGS = 'settings', // Owner Settings
  USER_SETTINGS = 'user_settings', // User Settings
  LEARNING = 'learning'
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
  status: 'inbox' | 'sandbox' | 'archived';
  isPinned?: boolean;
  color?: string;
}

export interface Task {
  id: string;
  content: string;
  description?: string;
  column: 'todo' | 'doing' | 'done';
  createdAt: number;
  reflection?: string;
  blockerAnalysis?: string;
  
  activeChallenge?: string;
  isChallengeCompleted?: boolean;
  challengeHistory?: string[];
  
  consultationHistory?: string[]; // New: History of saved AI responses
  
  isArchived?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReview: number;
  level: number;
}

export interface Challenge {
  id: string;
  text: string;
  relatedTaskId?: string;
  isCompleted: boolean;
}

export interface JournalEntry {
  id: string;
  date: number;
  content: string;
  linkedTaskId?: string; // Optional link to a specific task
  aiFeedback?: string;
  mentorId?: string;
}

// --- CONFIGURATION TYPES ---

export type AccessLevel = 'public' | 'owner_only' | 'restricted';

export interface AccessControl {
  accessLevel?: AccessLevel;
  allowedEmails?: string[];
  isDisabled?: boolean; // Global "Soft Delete" switch
}

export interface Mentor extends AccessControl {
  id: string;
  name: string;
  icon: string; // Key for IconMap
  color: string; // Tailwind class
  systemPrompt: string; // # SYSTEM instruction
  model?: string; // AI Model ID
}

export interface ChallengeAuthor extends AccessControl {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string; // AI Model ID
  responseMimeType?: 'text/plain' | 'application/json'; // Output format
}

export interface AIToolConfig extends AccessControl {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string; // AI Model ID
  responseMimeType?: 'text/plain' | 'application/json'; // Output format
}

export interface AppConfig {
  _version?: number; // Configuration Version Timestamp
  coreLibrary: string;
  mentors: Mentor[];
  challengeAuthors: ChallengeAuthor[];
  aiTools: AIToolConfig[];
}

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

export interface AppState {
  notes: Note[];
  tasks: Task[];
  flashcards: Flashcard[];
  challenges: Challenge[];
  journal: JournalEntry[]; // NEW
  config: AppConfig; // Dynamic Configuration
  user?: UserProfile; // Current User
}

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';