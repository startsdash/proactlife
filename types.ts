
declare global {
  interface Window {
    confetti: any;
  }
}

export enum Module {
  DASHBOARD = 'dashboard',
  NAPKINS = 'napkins',
  SKETCHPAD = 'sketchpad',
  SANDBOX = 'sandbox',
  MENTAL_GYM = 'mental_gym',
  KANBAN = 'kanban',
  RITUALS = 'rituals',
  JOURNAL = 'journal',
  MOODBAR = 'moodbar', // NEW
  ARCHIVE = 'archive',
  SETTINGS = 'settings',
  LEARNING = 'learning',
  USER_SETTINGS = 'user_settings'
}

export interface Note {
  id: string;
  title?: string; // NEW: Title field
  content: string;
  cover?: string; // NEW: Cover image URL or 'color:hex'
  tags: string[];
  createdAt: number;
  status: 'inbox' | 'sandbox' | 'archived';
  isPinned?: boolean;
  color?: string;
}

// NEW: Sketchpad Types
export interface SketchItem {
  id: string;
  type: 'text' | 'image';
  content: string; // Text string or Base64 Image
  createdAt: number;
  color?: string; // For text notes (tailwind class)
  rotation: number; // -3 to 3 degrees for realism
  widthClass?: string; // col-span-1 or col-span-2
}

export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  isPinned?: boolean; // NEW: Pin to card
}

export interface Task {
  id: string;
  title?: string; // NEW: Task Title
  content: string; // Description / Body
  description?: string; // Context/Source (e.g. original note)
  column: 'todo' | 'doing' | 'done';
  createdAt: number;
  reflection?: string;
  blockerAnalysis?: string;
  
  subtasks?: Subtask[]; // Checklist items

  activeChallenge?: string;
  pinnedChallengeIndices?: number[]; // NEW: Indices of pinned lines in activeChallenge
  isChallengeCompleted?: boolean;
  challengeHistory?: string[];
  
  consultationHistory?: string[];
  
  spheres?: string[]; // Manual sphere selection
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

export type HabitFrequency = 'daily' | 'specific_days' | 'times_per_week' | 'times_per_day';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  color: string; // Tailwind color class key (e.g. 'indigo')
  icon: string; // Icon key
  
  frequency: HabitFrequency;
  targetDays?: number[]; // 0 = Sunday, 1 = Monday, etc. (for 'specific_days')
  targetCount?: number; // used for 'times_per_week' AND 'times_per_day'
  
  reminders: string[]; // ["09:00", "20:00"]
  
  // Updated to support numbers for 'times_per_day' logic (count)
  history: Record<string, boolean | number>; // "YYYY-MM-DD" -> true OR count
  streak: number;
  bestStreak: number;
  
  spheres?: string[]; // Manual sphere selection
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
  spheres?: string[]; // Manual sphere selection
  isInsight?: boolean; // Toggle for dashboard stats
  
  // NEW: Mood Tracking
  mood?: number; // 1 (Worst) to 5 (Best)
  moodTags?: string[]; // e.g. ["Work", "Sleep", "Social"]
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

export interface InviteCode {
  code: string;
  createdAt: number;
  expiresAt: number | null; // null = permanent
  comment?: string;
  createdBy: string;
}

export interface AppConfig {
  _version?: number; 
  ownerEmail?: string; // NEW: Explicit owner definition
  isGuestModeEnabled?: boolean; // NEW: Controls whether unauthenticated users can access the app
  inviteCodes?: InviteCode[]; // NEW: List of active invite codes
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
  sketchpad: SketchItem[]; // NEW
  tasks: Task[];
  flashcards: Flashcard[];
  habits: Habit[]; 
  challenges: Challenge[];
  journal: JournalEntry[]; 
  mentorAnalyses: MentorAnalysis[]; 
  config: AppConfig; 
  user?: UserProfile; 
}

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';