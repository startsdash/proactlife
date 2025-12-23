
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Module, AppState, Note, Task, Flashcard, SyncStatus, AppConfig, JournalEntry, AccessControl, MentorAnalysis, Habit } from './types';
import { loadState, saveState } from './services/storageService';
import { initGapi, initGis, loadFromDrive, saveToDrive, requestAuth, restoreSession, getUserProfile, signOut } from './services/driveService';
import { DEFAULT_CONFIG } from './constants';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Napkins from './components/Napkins';
import Sandbox from './components/Sandbox';
import MentalGym from './components/MentalGym';
import Kanban from './components/Kanban';
import Rituals from './components/Rituals';
import Archive from './components/Archive';
import Settings from './components/Settings';
import Journal from './components/Journal';
import LearningMode from './components/LearningMode';
import UserSettings from './components/UserSettings';
import Onboarding from './components/Onboarding';
import { LogIn, Shield, CloudOff, ArrowRight } from 'lucide-react';

const OWNER_EMAIL = 'rukomrus@gmail.com';

const App: React.FC = () => {
  // --- THEME LOGIC ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // --- NAVIGATION LOGIC ---
  const getInitialModule = (): Module => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      // Validate tab against Module enum
      if (tab && Object.values(Module).includes(tab as Module)) {
        return tab as Module;
      }
    }
    // Default to NAPKINS
    return Module.NAPKINS;
  };

  const [module, setModule] = useState<Module>(getInitialModule);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Custom Navigation Handler that syncs with Browser History
  const handleNavigate = (newModule: Module) => {
    setModule(newModule);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newModule);
    window.history.pushState({ module: newModule }, '', url.toString());
  };

  // Listen for Browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const stateModule = event.state?.module;
      if (stateModule && Object.values(Module).includes(stateModule)) {
        setModule(stateModule);
      } else {
        // Fallback to URL parsing or Default if state is missing
        setModule(getInitialModule());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ------------------------

  const [data, setData] = useState<AppState>({
    notes: [], tasks: [], flashcards: [], habits: [], challenges: [], journal: [], mentorAnalyses: [], config: DEFAULT_CONFIG
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'syncing' | 'synced' | 'error'>('disconnected');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false); // Guard state
  const [journalContextTaskId, setJournalContextTaskId] = useState<string | null>(null); // Context for navigation (Journal)
  const [kanbanContextTaskId, setKanbanContextTaskId] = useState<string | null>(null); // Context for navigation (Kanban)
  
  // INVITE CODE LOGIC
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [guestSessionCode, setGuestSessionCode] = useState<string | null>(() => {
      return localStorage.getItem('live_act_guest_code');
  });

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
              
              if (!driveData.config || driveData.config._version !== DEFAULT_CONFIG._version) {
                  console.log("Drive Config outdated. Using Code Config.");
                  driveData.config = DEFAULT_CONFIG;
              }

              if (!driveData.journal) driveData.journal = [];
              if (!driveData.mentorAnalyses) driveData.mentorAnalyses = [];
              if (!driveData.habits) driveData.habits = [];
              
              setData(prev => ({...driveData, user: prev.user})); 
              saveState(driveData);
              setTimeout(() => { isHydratingRef.current = false; }, 100);
          }
          setHasLoadedFromCloud(true);
          setSyncStatus('synced');
      } catch (e) {
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

  const handleSignOut = () => {
    signOut();
    setIsDriveConnected(false);
    setSyncStatus('disconnected');
    setHasLoadedFromCloud(false);
    localStorage.removeItem('isGoogleAuthEnabled');
    
    // Also clear guest session on explicit sign out if we treat it as logout
    localStorage.removeItem('live_act_guest_code');
    setGuestSessionCode(null);
    
    const localData = loadState();
    setData(prev => ({ ...localData, user: undefined, config: prev.config }));
    alert("Вы вышли из профиля.");
  };

  const triggerAutoSave = useCallback((stateToSave: AppState) => {
    if (!isDriveConnected) return;
    if (!hasLoadedFromCloud) return;

    setSyncStatus('syncing');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
        try { await saveToDrive(stateToSave); setSyncStatus('synced'); }
        catch (e) { setSyncStatus('error'); }
    }, 2000); 
  }, [isDriveConnected, hasLoadedFromCloud]);

  useEffect(() => {
    if (!isLoaded || isHydratingRef.current) return;
    saveState(data);
    if (isDriveConnected) triggerAutoSave(data);
  }, [data, isLoaded, isDriveConnected, triggerAutoSave]);

  const addNote = (note: Note) => setData(p => ({ ...p, notes: [note, ...p.notes] }));
  
  const moveNoteToSandbox = (id: string) => setData(p => {
    const originalNote = p.notes.find(n => n.id === id);
    if (!originalNote) return p;
    // Don't modify original note status - just clone it to sandbox
    // This allows the user to keep the note in Inbox while working on it in Hub
    const sandboxClone: Note = {
      ...originalNote,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      status: 'sandbox',
      createdAt: Date.now()
    };
    return { ...p, notes: [sandboxClone, ...p.notes] };
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

  const addTask = (t: Task) => setData(p => ({ ...p, tasks: [...p.tasks, t] }));
  const updateTask = (t: Task) => setData(p => ({ ...p, tasks: p.tasks.map(x => x.id === t.id ? t : x) }));
  const deleteTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id) }));
  const archiveTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, isArchived: true } : t) }));
  const restoreTask = (id: string) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, isArchived: false, column: 'done' } : t) }));

  const reorderTask = (draggedId: string, targetId: string) => setData(p => {
      const tasks = [...p.tasks];
      const dIdx = tasks.findIndex(t => t.id === draggedId);
      const tIdx = tasks.findIndex(t => t.id === targetId);
      if (dIdx < 0 || tIdx < 0) return p;
      const [item] = tasks.splice(dIdx, 1);
      tasks.splice(tIdx, 0, item);
      return { ...p, tasks };
  });

  const addFlashcard = (c: Flashcard) => setData(p => ({ ...p, flashcards: [...p.flashcards, c] }));
  const deleteFlashcard = (id: string) => setData(p => ({ ...p, flashcards: p.flashcards.filter(f => f.id !== id) }));

  const addHabit = (h: Habit) => setData(p => ({ ...p, habits: [...p.habits, h] }));
  const updateHabit = (h: Habit) => setData(p => ({ ...p, habits: p.habits.map(x => x.id === h.id ? h : x) }));
  const deleteHabit = (id: string) => setData(p => ({ ...p, habits: p.habits.filter(h => h.id !== id) }));

  const addJournalEntry = (entry: JournalEntry) => setData(p => ({ ...p, journal: [...p.journal, entry] }));
  const updateJournalEntry = (entry: JournalEntry) => setData(p => ({ ...p, journal: p.journal.map(j => j.id === entry.id ? entry : j) }));
  const deleteJournalEntry = (id: string) => setData(p => ({ ...p, journal: p.journal.filter(j => j.id !== id) }));
  
  const addMentorAnalysis = (analysis: MentorAnalysis) => setData(p => ({ ...p, mentorAnalyses: [analysis, ...p.mentorAnalyses] }));
  const deleteMentorAnalysis = (id: string) => setData(p => ({ ...p, mentorAnalyses: p.mentorAnalyses.filter(a => a.id !== id) }));

  const handleReflectInJournal = (taskId: string) => {
    setJournalContextTaskId(taskId);
    handleNavigate(Module.JOURNAL);
  };
  
  const handleNavigateToTask = (taskId: string) => {
    setKanbanContextTaskId(taskId);
    handleNavigate(Module.KANBAN);
  };

  const updateConfig = (newConfig: AppConfig) => setData(p => ({ ...p, config: newConfig }));
  
  const isOwner = data.user?.email === OWNER_EMAIL;

  const visibleConfig = useMemo(() => {
    const configToFilter = data.config;
    const currentUserEmail = data.user?.email || '';

    const isVisible = (item: AccessControl) => {
       if (item.isDisabled) return false;
       if (isOwner) return true;
       const level = item.accessLevel || 'public';
       if (level === 'public') return true;
       if (level === 'owner_only') return false; 
       if (level === 'restricted') return item.allowedEmails?.includes(currentUserEmail) || false;
       return true;
    };

    return {
      ...configToFilter,
      mentors: (configToFilter.mentors || []).filter(isVisible),
      challengeAuthors: (configToFilter.challengeAuthors || []).filter(isVisible),
      aiTools: (configToFilter.aiTools || []).filter(isVisible),
    };
  }, [data.config, isOwner, data.user]);

  // INVITE CODE VALIDATION
  const validateGuestSession = (code: string | null): boolean => {
      if (!code) return false;
      const validCodes = data.config.inviteCodes || [];
      const match = validCodes.find(c => c.code === code);
      if (!match) return false;
      if (match.expiresAt && match.expiresAt < Date.now()) return false;
      return true;
  };

  const handleInviteCodeSubmit = () => {
      if (!inviteCodeInput) return;
      const code = inviteCodeInput.toUpperCase().trim();
      if (validateGuestSession(code)) {
          localStorage.setItem('live_act_guest_code', code);
          setGuestSessionCode(code);
          if (window.confetti) window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } else {
          alert('Неверный или истекший код приглашения');
      }
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200">Loading...</div>;

  // --- GUEST MODE GUARD ---
  const isGuestModeAllowed = data.config.isGuestModeEnabled ?? true;
  const isAuthenticated = !!data.user;
  const isGuestAuthenticated = validateGuestSession(guestSessionCode);

  if (!isGuestModeAllowed && !isAuthenticated && !isGuestAuthenticated) {
      return (
          <div className="flex flex-col h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] p-4 animate-in fade-in duration-500">
              <div className="w-full max-w-sm bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-900 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-lg">L</div>
                  <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Доступ ограничен</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                      Владелец отключил гостевой режим.
                  </p>
                  
                  <button 
                         onClick={() => handleDriveConnect(false)}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-indigo-200 dark:shadow-none mb-6"
                       >
                           <LogIn size={18} /> Войти через Google
                   </button>

                   <div className="flex items-center gap-4 mb-6">
                       <div className="h-[1px] bg-slate-200 dark:bg-slate-700 flex-1"></div>
                       <span className="text-xs text-slate-400 uppercase font-bold">ИЛИ</span>
                       <div className="h-[1px] bg-slate-200 dark:bg-slate-700 flex-1"></div>
                   </div>

                   <div className="flex gap-2">
                       <input 
                          type="text" 
                          placeholder="Инвайт код (6 символов)" 
                          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center uppercase font-mono tracking-widest text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value)}
                          maxLength={6}
                       />
                       <button 
                          onClick={handleInviteCodeSubmit}
                          disabled={inviteCodeInput.length < 6}
                          className="px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           <ArrowRight size={20} />
                       </button>
                   </div>
              </div>
              <div className="mt-8 text-xs text-slate-400 flex items-center gap-2">
                  <Shield size={12} /> Protected by LIVE.ACT Pro
              </div>
          </div>
      );
  }

  return (
    <Layout 
        currentModule={module} setModule={handleNavigate} syncStatus={syncStatus}
        onConnectDrive={() => handleDriveConnect(false)} isDriveConnected={isDriveConnected}
        isOwner={isOwner}
    >
      <Onboarding onClose={() => setShowOnboarding(false)} />
      {module === Module.LEARNING && <LearningMode onStart={() => handleNavigate(Module.NAPKINS)} onNavigate={handleNavigate} />}
      {module === Module.DASHBOARD && <Dashboard notes={data.notes} tasks={data.tasks} habits={data.habits} journal={data.journal} onNavigate={handleNavigate} />}
      {module === Module.NAPKINS && <Napkins notes={data.notes} config={visibleConfig} addNote={addNote} moveNoteToSandbox={moveNoteToSandbox} moveNoteToInbox={moveNoteToInbox} deleteNote={deleteNote} reorderNote={reorderNote} updateNote={updateNote} archiveNote={archiveNote} onAddTask={addTask} />}
      {module === Module.SANDBOX && <Sandbox notes={data.notes} config={visibleConfig} onProcessNote={archiveNote} onAddTask={addTask} onAddFlashcard={addFlashcard} deleteNote={deleteNote} />}
      {module === Module.KANBAN && <Kanban tasks={data.tasks} journalEntries={data.journal} config={visibleConfig} updateTask={updateTask} deleteTask={deleteTask} reorderTask={reorderTask} archiveTask={archiveTask} onReflectInJournal={handleReflectInJournal} initialTaskId={kanbanContextTaskId} onClearInitialTask={() => setKanbanContextTaskId(null)} />}
      {module === Module.RITUALS && <Rituals habits={data.habits} addHabit={addHabit} updateHabit={updateHabit} deleteHabit={deleteHabit} />}
      {module === Module.MENTAL_GYM && <MentalGym flashcards={data.flashcards} tasks={data.tasks} deleteFlashcard={deleteFlashcard} />}
      {module === Module.JOURNAL && <Journal entries={data.journal} mentorAnalyses={data.mentorAnalyses} tasks={data.tasks} config={visibleConfig} addEntry={addJournalEntry} deleteEntry={deleteJournalEntry} updateEntry={updateJournalEntry} addMentorAnalysis={addMentorAnalysis} deleteMentorAnalysis={deleteMentorAnalysis} initialTaskId={journalContextTaskId} onClearInitialTask={() => setJournalContextTaskId(null)} onNavigateToTask={handleNavigateToTask} />}
      {module === Module.ARCHIVE && <Archive tasks={data.tasks} restoreTask={restoreTask} deleteTask={deleteTask} />}
      {module === Module.USER_SETTINGS && <UserSettings user={data.user} syncStatus={syncStatus} isDriveConnected={isDriveConnected} onConnect={() => handleDriveConnect(false)} onSignOut={handleSignOut} onClose={() => handleNavigate(Module.NAPKINS)} theme={theme} toggleTheme={toggleTheme} />}
      {module === Module.SETTINGS && isOwner && <Settings config={data.config} onUpdateConfig={updateConfig} onClose={() => handleNavigate(Module.NAPKINS)} />}
    </Layout>
  );
};
export default App;
