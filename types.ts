
export enum Module {
  NAPKINS = 'napkins',
  SANDBOX = 'sandbox',
  MENTAL_GYM = 'mental_gym',
  KANBAN = 'kanban',
  RITUALS = 'rituals',
  JOURNAL = 'journal',
  ARCHIVE = 'archive',
  SETTINGS = 'settings',
  LEARNING = 'learning',
  USER_SETTINGS = 'user_settings'
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
  
  consultationHistory?: string[];
  
  isArchived?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReview: number;
  level: number;
}

// --- HABITS / RITUALS TYPES ---

export type HabitFrequency = 'daily' | 'specific_days' | 'times_per_week';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  color: string; // Tailwind color class key (e.g. 'indigo')
  icon: string; // Icon key
  
  frequency: HabitFrequency;
  targetDays?: number[]; // 0 = Sunday, 1 = Monday, etc. (for 'specific_days')
  targetCount?: number; // e.g. 3 times per week (for 'times_per_week')
  
  reminders: string[]; // ["09:00", "20:00"]
  
  history: Record<string, boolean>; // "YYYY-MM-DD" -> true
  streak: number;
  bestStreak: number;
  
  isArchived?: boolean;
  createdAt: number;
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
  linkedTaskId?: string; 
  aiFeedback?: string;
  mentorId?: string;
}

export interface MentorAnalysis {
  id: string;
  date: number;
  content: string;
  mentorName: string;
}

// --- CONFIGURATION TYPES ---

export type AccessLevel = 'public' | 'owner_only' | 'restricted';

export interface AccessControl {
  accessLevel?: AccessLevel;
  allowedEmails?: string[];
  isDisabled?: boolean; 
}

export interface Mentor extends AccessControl {
  id: string;
  name: string;
  icon: string; 
  color: string; 
  systemPrompt: string; 
  model?: string; 
}

export interface ChallengeAuthor extends AccessControl {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string; 
  responseMimeType?: 'text/plain' | 'application/json'; 
}

export interface AIToolConfig extends AccessControl {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string; 
  responseMimeType?: 'text/plain' | 'application/json'; 
}

export interface AppConfig {
  _version?: number; 
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
  habits: Habit[]; // NEW: Habits array
  challenges: Challenge[];
  journal: JournalEntry[]; 
  mentorAnalyses: MentorAnalysis[]; 
  config: AppConfig; 
  user?: UserProfile; 
}

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';
