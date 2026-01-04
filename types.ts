

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
  MOODBAR = 'moodbar',
  ARCHIVE = 'archive',
  SETTINGS = 'settings',
  LEARNING = 'learning',
  USER_SETTINGS = 'user_settings',
  PROFILE = 'profile' // NEW
}

export interface Note {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  createdAt: number;
  status: 'inbox' | 'sandbox' | 'archived';
  isPinned?: boolean;
  color?: string;
  coverUrl?: string;
}

export interface SketchItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  createdAt: number;
  color?: string;
  rotation: number;
  widthClass?: string;
}

export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  isPinned?: boolean;
}

export interface Task {
  id: string;
  title?: string;
  content: string;
  description?: string;
  column: 'todo' | 'doing' | 'done';
  createdAt: number;
  reflection?: string;
  blockerAnalysis?: string;
  coverUrl?: string;
  color?: string;
  
  subtasks?: Subtask[];

  activeChallenge?: string;
  pinnedChallengeIndices?: number[];
  isChallengeCompleted?: boolean;
  challengeHistory?: string[];
  
  consultationHistory?: string[];
  
  spheres?: string[];
  isArchived?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReview: number;
  level: number;
}

export type HabitFrequency = 'daily' | 'specific_days' | 'times_per_week' | 'times_per_day';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  
  frequency: HabitFrequency;
  targetDays?: number[];
  targetCount?: number;
  
  reminders: string[];
  
  history: Record<string, boolean | number>;
  streak: number;
  bestStreak: number;
  
  spheres?: string[];
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
  spheres?: string[];
  isInsight?: boolean;
  
  mood?: number;
  moodTags?: string[];
}

export interface MentorAnalysis {
  id: string;
  date: number;
  content: string;
  mentorName: string;
}

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
  expiresAt: number | null;
  comment?: string;
  createdBy: string;
}

export interface AppConfig {
  _version?: number; 
  ownerEmail?: string;
  isGuestModeEnabled?: boolean;
  inviteCodes?: InviteCode[];
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

export type IdentityRole = 'hero' | 'explorer' | 'architect';

export interface UserProfileConfig {
    role: IdentityRole;
    manifesto: string;
}

export interface AppState {
  notes: Note[];
  sketchpad: SketchItem[];
  tasks: Task[];
  flashcards: Flashcard[];
  habits: Habit[]; 
  challenges: Challenge[];
  journal: JournalEntry[]; 
  mentorAnalyses: MentorAnalysis[]; 
  config: AppConfig; 
  user?: UserProfile; 
  profileConfig?: UserProfileConfig; // NEW
}

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';