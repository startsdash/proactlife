import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, Module, Note, Task, Habit, JournalEntry, Flashcard, 
  SketchItem, MentorAnalysis, AppConfig, UserProfile, UserProfileConfig, SyncStatus 
} from './types';
import { loadState, saveState } from './services/storageService';
import * as DriveService from './services/driveService';
import { DEFAULT_CONFIG } from './constants';

import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Napkins from './components/Napkins';
import Sandbox from './components/Sandbox';
import Kanban from './components/Kanban';
import Rituals from './components/Rituals';
import Journal from './components/Journal';
import Archive from './components/Archive';
import Settings from './components/Settings';
import LearningMode from './components/LearningMode';
import UserSettings from './components/UserSettings';
import Sketchpad from './components/Sketchpad';
import Ether from './components/Ether';
import MentalGym from './components/MentalGym';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';

const App: React.FC = () => {
  const [data, setData] = useState<AppState>(loadState());
  const [module, setModule] = useState<Module>(Module.DASHBOARD);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [user, setUser] = useState<UserProfile | undefined>(undefined);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Navigation Contexts
  const [napkinsContextNoteId, setNapkinsContextNoteId] = useState<string | null>(null);
  const [kanbanContextTaskId, setKanbanContextTaskId] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Theme Init
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
    
    // Drive Init
    const initDrive = async () => {
        try {
            await DriveService.initGapi();
            const profile = await DriveService.getUserProfile();
            if (profile) {
                setUser(profile);
                setIsDriveConnected(true);
                setSyncStatus('synced');
            } else if (DriveService.restoreSession()) {
               // Try to restore if we have tokens but no profile yet (lazy load)
               // Usually getUserProfile would work if tokens are valid
            }
        } catch (e) {
            console.error("Drive Init Error", e);
            setSyncStatus('error');
        }
    };
    initDrive();
  }, []);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- PERSISTENCE ---
  useEffect(() => {
    saveState(data);
    if (isDriveConnected && syncStatus !== 'syncing') {
        const timeout = setTimeout(() => {
            setSyncStatus('syncing');
            DriveService.saveToDrive(data)
                .then(() => setSyncStatus('synced'))
                .catch(() => setSyncStatus('error'));
        }, 5000); // Debounce cloud save
        return () => clearTimeout(timeout);
    }
  }, [data, isDriveConnected]);

  const handleConnectDrive = () => {
      DriveService.initGis(async () => {
          const profile = await DriveService.getUserProfile();
          if (profile) {
              setUser(profile);
              setIsDriveConnected(true);
              setSyncStatus('syncing');
              // Merge strategy: Load remote, if exists, merge/replace local?
              // For simplicity in this version: Remote wins if newer or we just load it.
              // Here we just load remote state to be safe.
              const cloudState = await DriveService.loadFromDrive();
              if (cloudState) {
                  setData(cloudState);
              }
              setSyncStatus('synced');
          }
      });
  };

  const handleSignOut = () => {
      DriveService.signOut();
      setUser(undefined);
      setIsDriveConnected(false);
      setSyncStatus('disconnected');
  };

  // --- DATA HANDLERS ---

  // Notes
  const addNote = (note: Note) => setData(prev => ({ ...prev, notes: [note, ...prev.notes] }));
  const updateNote = (note: Note) => setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === note.id ? note : n) }));
  // Soft Delete
  const softDeleteNote = (id: string) => setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, status: 'trash' } : n) }));
  // Hard Delete
  const hardDeleteNote = (id: string) => setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
  
  const moveNoteToSandbox = (id: string) => setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, status: 'sandbox' } : n) }));
  const moveNoteToInbox = (id: string) => setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, status: 'inbox' } : n) }));
  const archiveNote = (id: string) => setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, status: 'archived' } : n) }));
  const reorderNote = (draggedId: string, targetId: string) => {
      const notesCopy = [...data.notes];
      const draggedIdx = notesCopy.findIndex(n => n.id === draggedId);
      const targetIdx = notesCopy.findIndex(n => n.id === targetId);
      if (draggedIdx > -1 && targetIdx > -1) {
          const [dragged] = notesCopy.splice(draggedIdx, 1);
          notesCopy.splice(targetIdx, 0, dragged);
          setData(prev => ({ ...prev, notes: notesCopy }));
      }
  };

  // Tasks
  const addTask = (task: Task) => setData(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
  const updateTask = (task: Task) => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === task.id ? task : t) }));
  // Soft Delete / Archive
  const archiveTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, isArchived: true } : t) }));
  // Restore
  const restoreTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, isArchived: false } : t) }));
  // Hard Delete
  const deleteTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  const reorderTask = (draggedId: string, targetId: string) => {
      const tasksCopy = [...data.tasks];
      const draggedIdx = tasksCopy.findIndex(t => t.id === draggedId);
      const targetIdx = tasksCopy.findIndex(t => t.id === targetId);
      if (draggedIdx > -1 && targetIdx > -1) {
          const [dragged] = tasksCopy.splice(draggedIdx, 1);
          tasksCopy.splice(targetIdx, 0, dragged);
          setData(prev => ({ ...prev, tasks: tasksCopy }));
      }
  };

  // Habits
  const addHabit = (habit: Habit) => setData(prev => ({ ...prev, habits: [habit, ...prev.habits] }));
  const updateHabit = (habit: Habit) => setData(prev => ({ ...prev, habits: prev.habits.map(h => h.id === habit.id ? habit : h) }));
  const deleteHabit = (id: string) => setData(prev => ({ ...prev, habits: prev.habits.filter(h => h.id !== id) }));

  // Journal
  const addJournalEntry = (entry: JournalEntry) => setData(prev => ({ ...prev, journal: [entry, ...prev.journal] }));
  const updateJournalEntry = (entry: JournalEntry) => setData(prev => ({ ...prev, journal: prev.journal.map(e => e.id === entry.id ? entry : e) }));
  const deleteJournalEntry = (id: string) => setData(prev => ({ ...prev, journal: prev.journal.filter(e => e.id !== id) })); // Hard delete from Archive? 
  // Let's implement soft delete for journal too
  const softDeleteJournalEntry = (id: string) => setData(prev => ({ ...prev, journal: prev.journal.map(e => e.id === id ? { ...e, isArchived: true } : e) }));
  const restoreJournalEntry = (id: string) => setData(prev => ({ ...prev, journal: prev.journal.map(e => e.id === id ? { ...e, isArchived: false } : e) }));

  // Flashcards
  const addFlashcard = (card: Flashcard) => setData(prev => ({ ...prev, flashcards: [card, ...prev.flashcards] }));
  const deleteFlashcard = (id: string) => setData(prev => ({ ...prev, flashcards: prev.flashcards.filter(c => c.id !== id) }));
  const toggleFlashcardStar = (id: string) => setData(prev => ({ ...prev, flashcards: prev.flashcards.map(c => c.id === id ? { ...c, isStarred: !c.isStarred } : c) }));

  // Sketchpad
  const addSketchItem = (item: SketchItem) => setData(prev => ({ ...prev, sketchpad: [item, ...prev.sketchpad] }));
  const updateSketchItem = (item: SketchItem) => setData(prev => ({ ...prev, sketchpad: prev.sketchpad.map(i => i.id === item.id ? item : i) }));
  const deleteSketchItem = (id: string) => setData(prev => ({ ...prev, sketchpad: prev.sketchpad.filter(i => i.id !== id) }));

  // Mentor Analysis
  const addMentorAnalysis = (analysis: MentorAnalysis) => setData(prev => ({ ...prev, mentorAnalyses: [analysis, ...prev.mentorAnalyses] }));
  const deleteMentorAnalysis = (id: string) => setData(prev => ({ ...prev, mentorAnalyses: prev.mentorAnalyses.filter(a => a.id !== id) }));

  // Config
  const updateConfig = (config: AppConfig) => setData(prev => ({ ...prev, config }));
  const updateProfileConfig = (profileConfig: UserProfileConfig) => setData(prev => ({ ...prev, profileConfig }));

  // Navigation Helpers
  const navigateToTask = (taskId: string) => {
      setKanbanContextTaskId(taskId);
      setModule(Module.KANBAN);
  };

  const navigateToNote = (noteId: string) => {
      setNapkinsContextNoteId(noteId);
      setModule(Module.NAPKINS);
  };

  // Safe config fallback
  const visibleConfig = data.config || DEFAULT_CONFIG;

  return (
    <>
      <Layout 
        currentModule={module} 
        setModule={setModule} 
        syncStatus={syncStatus}
        onConnectDrive={handleConnectDrive}
        isDriveConnected={isDriveConnected}
        isOwner={user?.email === visibleConfig.ownerEmail}
        role={data.profileConfig?.role || 'architect'}
        habits={data.habits}
        config={visibleConfig}
        userEmail={user?.email}
      >
        {module === Module.DASHBOARD && (
            <Dashboard 
                notes={data.notes.filter(n => n.status !== 'trash')}
                tasks={data.tasks.filter(t => !t.isArchived)}
                habits={data.habits.filter(h => !h.isArchived)}
                journal={data.journal.filter(j => !j.isArchived)}
                flashcards={data.flashcards}
                onNavigate={setModule}
            />
        )}
        {module === Module.NAPKINS && (
            <Napkins 
              notes={data.notes.filter(n => n.status !== 'trash')} 
              config={visibleConfig} 
              addNote={addNote} 
              moveNoteToSandbox={moveNoteToSandbox} 
              moveNoteToInbox={moveNoteToInbox} 
              deleteNote={softDeleteNote} // Soft delete
              reorderNote={reorderNote} 
              updateNote={updateNote} 
              archiveNote={archiveNote} 
              onAddTask={addTask} 
              onAddJournalEntry={addJournalEntry}
              addSketchItem={addSketchItem} 
              initialNoteId={napkinsContextNoteId}
              onClearInitialNote={() => setNapkinsContextNoteId(null)}
              journalEntries={data.journal}
              tasks={data.tasks}
              habits={data.habits}
              addHabit={addHabit}
            />
        )}
        {module === Module.SANDBOX && (
            <Sandbox 
                notes={data.notes.filter(n => n.status !== 'trash')}
                tasks={data.tasks}
                flashcards={data.flashcards}
                config={visibleConfig}
                onProcessNote={archiveNote}
                onAddTask={addTask}
                onAddFlashcard={addFlashcard}
                deleteNote={softDeleteNote}
            />
        )}
        {module === Module.KANBAN && (
            <Kanban 
                tasks={data.tasks.filter(t => !t.isArchived)}
                journalEntries={data.journal.filter(j => !j.isArchived)}
                config={visibleConfig}
                addTask={addTask}
                updateTask={updateTask}
                deleteTask={archiveTask} // Soft delete
                reorderTask={reorderTask}
                archiveTask={archiveTask}
                onReflectInJournal={(taskId) => {
                    addJournalEntry({
                        id: Date.now().toString(),
                        date: Date.now(),
                        content: '',
                        linkedTaskId: taskId,
                        isInsight: false
                    });
                    setModule(Module.JOURNAL);
                }}
                initialTaskId={kanbanContextTaskId}
                onClearInitialTask={() => setKanbanContextTaskId(null)}
            />
        )}
        {module === Module.RITUALS && (
            <Rituals 
                habits={data.habits.filter(h => !h.isArchived)}
                addHabit={addHabit}
                updateHabit={updateHabit}
                deleteHabit={(id) => updateHabit({ ...data.habits.find(h => h.id === id)!, isArchived: true })} // Soft
            />
        )}
        {module === Module.JOURNAL && (
            <Journal 
                entries={data.journal.filter(j => !j.isArchived)}
                mentorAnalyses={data.mentorAnalyses}
                tasks={data.tasks}
                notes={data.notes}
                config={visibleConfig}
                addEntry={addJournalEntry}
                updateEntry={updateJournalEntry}
                deleteEntry={softDeleteJournalEntry} // Soft
                addMentorAnalysis={addMentorAnalysis}
                deleteMentorAnalysis={deleteMentorAnalysis}
                onNavigateToTask={navigateToTask}
                onNavigateToNote={navigateToNote}
            />
        )}
        {module === Module.ARCHIVE && (
            <Archive 
                tasks={data.tasks}
                notes={data.notes}
                journal={data.journal}
                restoreTask={restoreTask}
                deleteTask={deleteTask} // Hard
                moveNoteToInbox={moveNoteToInbox}
                deleteNote={hardDeleteNote} // Hard
                deleteJournalEntry={deleteJournalEntry} // Hard
                restoreJournalEntry={restoreJournalEntry}
            />
        )}
        {module === Module.SETTINGS && (
            <Settings 
                config={visibleConfig}
                onUpdateConfig={updateConfig}
                onClose={() => setModule(Module.DASHBOARD)}
            />
        )}
        {module === Module.LEARNING && (
            <LearningMode 
                onStart={() => setModule(Module.DASHBOARD)} 
                onNavigate={setModule}
            />
        )}
        {module === Module.USER_SETTINGS && (
            <UserSettings 
                user={user}
                syncStatus={syncStatus}
                isDriveConnected={isDriveConnected}
                onConnect={handleConnectDrive}
                onSignOut={handleSignOut}
                onClose={() => setModule(Module.DASHBOARD)}
                theme={theme}
                toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            />
        )}
        {module === Module.SKETCHPAD && (
            <Sketchpad 
                items={data.sketchpad}
                addItem={addSketchItem}
                updateItem={updateSketchItem}
                deleteItem={deleteSketchItem}
            />
        )}
        {module === Module.ETHER && (
            <Ether 
                notes={data.notes.filter(n => n.status !== 'trash')}
                onUpdateNote={updateNote}
            />
        )}
        {module === Module.MENTAL_GYM && (
            <MentalGym 
                flashcards={data.flashcards}
                tasks={data.tasks}
                deleteFlashcard={deleteFlashcard}
                toggleFlashcardStar={toggleFlashcardStar}
            />
        )}
        {module === Module.PROFILE && (
            <Profile 
                notes={data.notes}
                tasks={data.tasks}
                habits={data.habits}
                journal={data.journal}
                flashcards={data.flashcards}
                config={data.profileConfig || { role: 'architect', manifesto: '...' }}
                onUpdateConfig={updateProfileConfig}
            />
        )}
      </Layout>
      <Onboarding onClose={() => {}} />
    </>
  );
};

export default App;
