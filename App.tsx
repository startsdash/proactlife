
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Module, AppState, Note, Task, Flashcard, SyncStatus, AppConfig, JournalEntry, AccessControl } from './types';
import { loadState, saveState } from './services/storageService';
import { initGapi, initGis, loadFromDrive, saveToDrive, requestAuth, restoreSession, getUserProfile } from './services/driveService';
import { DEFAULT_CONFIG } from './constants';
import Layout from './components/Layout';
import Napkins from './components/Napkins';
import Sandbox from './components/Sandbox';
import MentalGym from './components/MentalGym';
import Kanban from './components/Kanban';
import Archive from './components/Archive';
import Settings from './components/Settings';
import Journal from './components/Journal';

const OWNER_EMAIL = 'rukomrus@gmail.com';

const App: React.FC = () => {
  const [module, setModule] = useState<Module>(Module.NAPKINS);
  const [data, setData] = useState<AppState>({
    notes: [], tasks: [], flashcards: [], challenges: [], journal: [], config: DEFAULT_CONFIG
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false); // Guard state
  const [journalContextTaskId, setJournalContextTaskId] = useState<string | null>(null); // Context for navigation (Journal)
  const [kanbanContextTaskId, setKanbanContextTaskId] = useState<string | null>(null); // Context for navigation (Kanban)

  const isHydratingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = async () => {
    const profile = await getUserProfile();
    if (profile) {
      console.log(`Logged in as: ${profile.email}`);
      setData(prev => ({ ...prev, user: profile }));
    }
  };

  useEffect(() => {
    console.log('LIVE.ACT Pro v2.0.0 (Owner Mode)');
    const failSafeTimer = setTimeout(() => { if (!isLoaded) setIsLoaded(true); }, 4000);

    const initializeApp = async () => {
      const localData = loadState();
      setData(localData);
      try {
        await initGapi();
        await initGis(() => {});
        const restored = restoreSession();
        if (restored) {
            setIsDriveConnected(true);
            setSyncStatus('synced');
            await fetchProfile();
            handleDriveLoad(true);
        } else {
            const wasConnected = localStorage.getItem('isGoogleAuthEnabled') === 'true';
            if (wasConnected && !isDriveConnected) handleDriveConnect(true);
            else setIsLoaded(true);
        }
      } catch (e) {
        console.error("Init Error", e);
        setIsLoaded(true);
      }
    };
    initializeApp();
    return () => clearTimeout(failSafeTimer);
  }, []);

  const handleDriveLoad = async (isStartup: boolean) => {
      try {
          if (isStartup) setSyncStatus('syncing');
          const driveData = await loadFromDrive();
          if (driveData) {
              isHydratingRef.current = true;
              // Merge Config: If drive config is missing properties, fill from default
              if (!driveData.config) driveData.config = DEFAULT_CONFIG;
              // Merge Journal if missing (migration)
              if (!driveData.journal) driveData.journal = [];
              
              setData(prev => ({...driveData, user: prev.user})); // Keep user from fetchProfile
              saveState(driveData);
              setTimeout(() => { isHydratingRef.current = false; }, 100);
          }
          // Success: Either we loaded data, or confirmed no data exists in cloud
          setHasLoadedFromCloud(true);
          setSyncStatus('synced');
      } catch (e) {
          // Error: Do NOT set hasLoadedFromCloud to true
          setSyncStatus('error');
      } finally {
          setIsLoaded(true);
      }
  };

  const handleDriveConnect = async (silent: boolean = false) => {
    if (!silent && isDriveConnected) return;
    if (silent && (!localStorage.getItem('isGoogleAuthEnabled') || isDriveConnected)) return;
    try {
        if (!silent) setSyncStatus('syncing');
        await requestAuth(silent);
        setIsDriveConnected(true);
        localStorage.setItem('isGoogleAuthEnabled', 'true');
        await fetchProfile();
        await handleDriveLoad(false);
        if (!silent) triggerAutoSave(data);
    } catch (e: any) {
        if (silent) { setIsDriveConnected(false); setSyncStatus('disconnected'); }
        else { setSyncStatus('error'); setIsDriveConnected(false); }
    } finally {
        setIsLoaded(true);
    }
  };

  const triggerAutoSave = useCallback((stateToSave: AppState) => {
    if (!isDriveConnected) return;
    
    // Safety Guard: Don't save if we haven't confirmed cloud state yet
    if (!hasLoadedFromCloud) {
       console.warn("Safety Guard: Cloud load not confirmed, skipping save.");
       return;
    }

    setSyncStatus('syncing');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
        try { await saveToDrive(stateToSave); setSyncStatus('synced'); }
        catch (e) { 
          console.error("Save Error:", e);
          setSyncStatus('error'); 
        }
    }, 2000); 
  }, [isDriveConnected, hasLoadedFromCloud]);

  useEffect(() => {
    if (!isLoaded || isHydratingRef.current) return;
    saveState(data);
    if (isDriveConnected) triggerAutoSave(data);
  }, [data, isLoaded, isDriveConnected, triggerAutoSave]);

  // --- Handlers ---
  const addNote = (note: Note) => setData(p => ({ ...p, notes: [note, ...p.notes] }));
  
  // LOGIC CHANGE: Move to Sandbox = Archive original + Create clone in Sandbox
  const moveNoteToSandbox = (id: string) => setData(p => {
    const originalNote = p.notes.find(n => n.id === id);
    if (!originalNote) return p;

    // 1. Archive the original note (keeps it in Library)
    const updatedNotes = p.notes.map(n => n.id === id ? { ...n, status: 'archived' as const } : n);
    
    // 2. Create a clone for the Sandbox
    const sandboxClone: Note = {
      ...originalNote,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // New unique ID
      status: 'sandbox',
      createdAt: Date.now() // Fresh timestamp for the sandbox work item
    };

    return {
      ...p,
      notes: [sandboxClone, ...updatedNotes]
    };
  });

  const moveNoteToInbox = (id: string) => setData(p => ({ ...p, notes: p.notes.map(n => n.id === id ? { ...n, status: 'inbox' } : n) }));
  const archiveNote = (id: string) => setData(p => ({ ...p, notes: p.notes.map(n => n.id === id ? { ...n, status: 'archived' } : n) }));
  const deleteNote = (id: string) => setData(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) }));
  const updateNote = (n: Note) => setData(p => ({ ...p, notes: p.notes.map(x => x.id === n.id ? n : x) }));
  
  const reorderNote = (draggedId: string, targetId: string) => setData(p => {
      const notes = [...p.notes];
      const dIdx = notes.findIndex(n => n.id === draggedId);
      const tIdx = notes.findIndex(n => n.id === targetId);
      if (dIdx < 0 || tIdx < 0) return p;
      const [item] = notes.splice(dIdx, 1);
      notes.splice(tIdx, 0, item);
      return { ...p, notes };
  });

  const reorderTask = (draggedId: string, targetId: string) => setData(p => {
      const tasks = [...p.tasks];
      const dIdx = tasks.findIndex(t => t.id === draggedId);
      const tIdx = tasks.findIndex(t => t.id === targetId);
      if (dIdx < 0 || tIdx < 0) return p;
      const [item] = tasks.splice(dIdx, 1);
      tasks.splice(tIdx, 0, item);
      return { ...p, tasks };
  });

  const addTask = (t: Task) => setData(p => ({ ...p, tasks: [...p.tasks, t] }));
  const updateTask = (t: Task) => setData(p => ({ ...p, tasks: p.tasks.map(x => x.id === t.id ? t : x) }));
  const deleteTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id) }));
  const archiveTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, isArchived: true } : t) }));
  const restoreTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, isArchived: false, column: 'done' } : t) }));

  const addFlashcard = (c: Flashcard) => setData(p => ({ ...p, flashcards: [...p.flashcards, c] }));
  const deleteFlashcard = (id: string) => setData(p => ({ ...p, flashcards: p.flashcards.filter(f => f.id !== id) }));

  // Journal Handlers
  const addJournalEntry = (entry: JournalEntry) => setData(p => ({ ...p, journal: [...p.journal, entry] }));
  const updateJournalEntry = (entry: JournalEntry) => setData(p => ({ ...p, journal: p.journal.map(j => j.id === entry.id ? entry : j) }));
  const deleteJournalEntry = (id: string) => setData(p => ({ ...p, journal: p.journal.filter(j => j.id !== id) }));
  
  // Navigation Handler
  const handleReflectInJournal = (taskId: string) => {
    setJournalContextTaskId(taskId);
    setModule(Module.JOURNAL);
  };
  
  const handleClearJournalContext = () => {
    setJournalContextTaskId(null);
  };

  const handleNavigateToTask = (taskId: string) => {
    setKanbanContextTaskId(taskId);
    setModule(Module.KANBAN);
  };

  const updateConfig = (newConfig: AppConfig) => setData(p => ({ ...p, config: newConfig }));

  const isOwner = data.user?.email === OWNER_EMAIL;

  // Filter Configuration based on User Access
  const visibleConfig = useMemo(() => {
    // Helper to merge user config with system defaults
    const mergeWithDefaults = <T extends { id: string }>(userItems: T[], defaultItems: T[]): T[] => {
      const userIds = new Set(userItems.map(i => i.id));
      const missingDefaults = defaultItems.filter(d => !userIds.has(d.id));
      return [...userItems, ...missingDefaults];
    };

    // 1. Reconcile Configuration with Defaults
    // This ensures new system Generators/Mentors appear even if user config is stale
    const reconciledConfig: AppConfig = {
        ...data.config,
        mentors: mergeWithDefaults(data.config.mentors, DEFAULT_CONFIG.mentors),
        challengeAuthors: mergeWithDefaults(data.config.challengeAuthors, DEFAULT_CONFIG.challengeAuthors),
        aiTools: mergeWithDefaults(data.config.aiTools, DEFAULT_CONFIG.aiTools)
    };

    // Owner sees everything (reconciled)
    if (isOwner) return reconciledConfig;

    const currentUserEmail = data.user?.email || '';

    const hasAccess = (item: AccessControl) => {
       const level = item.accessLevel || 'public';
       if (level === 'public') return true;
       if (level === 'owner_only') return false;
       if (level === 'restricted') {
          return item.allowedEmails?.includes(currentUserEmail) || false;
       }
       return true;
    };

    return {
      ...reconciledConfig,
      mentors: reconciledConfig.mentors.filter(hasAccess),
      challengeAuthors: reconciledConfig.challengeAuthors.filter(hasAccess),
      aiTools: reconciledConfig.aiTools.filter(hasAccess),
    };
  }, [data.config, isOwner, data.user]);

  if (!isLoaded) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Layout 
        currentModule={module} setModule={setModule} syncStatus={syncStatus}
        onConnectDrive={() => handleDriveConnect(false)} isDriveConnected={isDriveConnected}
        isOwner={isOwner}
    >
      {module === Module.NAPKINS && <Napkins notes={data.notes} config={visibleConfig} addNote={addNote} moveNoteToSandbox={moveNoteToSandbox} moveNoteToInbox={moveNoteToInbox} deleteNote={deleteNote} reorderNote={reorderNote} updateNote={updateNote} archiveNote={archiveNote} onAddTask={addTask} />}
      {module === Module.SANDBOX && <Sandbox notes={data.notes} config={visibleConfig} onProcessNote={archiveNote} onAddTask={addTask} onAddFlashcard={addFlashcard} deleteNote={deleteNote} />}
      {module === Module.MENTAL_GYM && <MentalGym flashcards={data.flashcards} tasks={data.tasks} deleteFlashcard={deleteFlashcard} />}
      {module === Module.KANBAN && <Kanban tasks={data.tasks} journalEntries={data.journal} config={visibleConfig} updateTask={updateTask} deleteTask={deleteTask} reorderTask={reorderTask} archiveTask={archiveTask} onReflectInJournal={handleReflectInJournal} initialTaskId={kanbanContextTaskId} onClearInitialTask={() => setKanbanContextTaskId(null)} />}
      {module === Module.JOURNAL && <Journal entries={data.journal} tasks={data.tasks} config={visibleConfig} addEntry={addJournalEntry} deleteEntry={deleteJournalEntry} updateEntry={updateJournalEntry} initialTaskId={journalContextTaskId} onClearInitialTask={handleClearJournalContext} onNavigateToTask={handleNavigateToTask} />}
      {module === Module.ARCHIVE && <Archive tasks={data.tasks} restoreTask={restoreTask} deleteTask={deleteTask} />}
      {/* Pass full config to Settings (Owner needs to see all to edit) */}
      {module === Module.SETTINGS && isOwner && <Settings config={data.config} onUpdateConfig={updateConfig} />}
    </Layout>
  );
};
export default App;
