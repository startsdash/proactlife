
import React, { useState, useEffect } from 'react';
import { Module, SyncStatus, IdentityRole, Habit } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Trophy, Book, FlaskConical, PanelLeftClose, PanelLeftOpen, Shield, Menu, Flame, LayoutDashboard, Fingerprint, Diamond, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';

interface Props {
  currentModule: Module;
  setModule: (m: Module) => void;
  children: React.ReactNode;
  syncStatus: SyncStatus;
  onConnectDrive: () => void;
  isDriveConnected: boolean;
  isOwner: boolean;
  role: IdentityRole;
  habits: Habit[];
}

const NAV_GROUPS = [
  {
    id: '01_FOUNDATION',
    items: [
      { id: Module.NAPKINS, icon: StickyNote, label: 'Заметки' },
      { id: Module.SANDBOX, icon: Box, label: 'Хаб' },
    ]
  },
  {
    id: '02_FLOW',
    items: [
      { id: Module.KANBAN, icon: KanbanIcon, label: 'Спринты' },
      { id: Module.RITUALS, icon: Flame, label: 'Трекер' },
      { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Скиллы' },
      { id: Module.JOURNAL, icon: Book, label: 'Дневник' },
    ]
  },
  {
    id: '03_MASTERY',
    items: [
      { id: Module.DASHBOARD, icon: LayoutDashboard, label: 'Обзор' },
      { id: Module.ARCHIVE, icon: Trophy, label: 'Архив' },
    ]
  }
];

const ROLE_COLORS: Record<IdentityRole, string> = {
    hero: 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    explorer: 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    architect: 'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
};

const SidebarAccumulator = ({ habits, expanded }: { habits: Habit[], expanded: boolean }) => {
    const getLocalDateKey = (date: Date) => {
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
    };
    
    const todayKey = getLocalDateKey(new Date());
    const active = habits.filter(h => !h.isArchived);
    const total = active.length;
    const done = active.filter(h => h.history[todayKey]).length;
    const percent = total > 0 ? (done / total) * 100 : 0;
    
    if (total === 0) return null;

    return (
        <div className={`transition-all duration-300 mb-2 ${expanded ? 'px-6 py-2' : 'flex justify-center py-4'}`}>
            {expanded ? (
                <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden group">
                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Энергия</span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{Math.round(percent)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, ease: "circOut" }}
                        />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            ) : (
                <Tooltip content={`Заряд: ${Math.round(percent)}%`} side="right">
                    <div className="w-1.5 h-10 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 flex flex-col justify-end">
                         <motion.div 
                            className="w-full bg-gradient-to-t from-indigo-500 to-emerald-500"
                            initial={{ height: 0 }}
                            animate={{ height: `${percent}%` }}
                            transition={{ duration: 1, ease: "circOut" }}
                        />
                    </div>
                </Tooltip>
            )}
        </div>
    )
}

const Layout: React.FC<Props> = ({ currentModule, setModule, children, syncStatus, onConnectDrive, isDriveConnected, isOwner, role, habits }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'bg-amber-500 animate-pulse';
      case 'synced': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'disconnected': default: return 'bg-slate-300 dark:bg-slate-600';
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-500">
      
      {/* MOBILE BACKDROP */}
      <AnimatePresence>
      {isMobile && isExpanded && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsExpanded(false)}
        />
      )}
      </AnimatePresence>

      {/* MOBILE OPEN BUTTON */}
      <AnimatePresence>
      {isMobile && !isExpanded && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-6 left-4 z-40 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-full shadow-lg md:hidden active:scale-95"
          >
            <Menu size={20} strokeWidth={1.5} />
          </motion.button>
      )}
      </AnimatePresence>

      {/* AETHER SIDEBAR */}
      <aside 
        className={`
            flex flex-col shrink-0 z-50
            fixed inset-y-0 left-0 h-full md:relative md:h-auto
            bg-white/60 dark:bg-[#0f172a]/40 backdrop-blur-2xl
            border-r border-slate-200/50 dark:border-white/5
            transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
            ${isExpanded ? 'w-64 translate-x-0 shadow-2xl md:shadow-none' : 'w-64 md:w-[72px] -translate-x-full md:translate-x-0'}
        `}
      >
        {/* HEADER */}
        <div className="shrink-0 h-20 flex items-center justify-between px-6 border-b border-transparent">
             <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                <div className="w-6 h-6 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center text-white dark:text-black font-bold text-xs shrink-0 select-none">
                    L
                </div>
                <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                    <span className="font-sans font-bold text-sm tracking-tight text-slate-900 dark:text-white">LIVE.ACT</span>
                </div>
             </div>

             {isExpanded && (
                 <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <PanelLeftClose size={16} strokeWidth={1} />
                 </button>
             )}
        </div>

        {/* EXPAND TRIGGER (Desktop Collapsed) */}
        {!isExpanded && (
            <div className="hidden md:flex justify-center w-full py-4">
                <button onClick={() => setIsExpanded(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <PanelLeftOpen size={16} strokeWidth={1} />
                </button>
            </div>
        )}

        {/* ACCUMULATOR WIDGET */}
        <SidebarAccumulator habits={habits} expanded={isExpanded} />

        {/* NAV GROUPS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-none px-4 py-2 space-y-8">
            {NAV_GROUPS.map(group => (
                <div key={group.id} className="space-y-2">
                    <div className={`text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest pl-2 mb-2 select-none transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                        {group.id}
                    </div>
                    {group.items.map(item => {
                        const isActive = currentModule === item.id;
                        return (
                            <Tooltip key={item.id} content={item.label} side="right" disabled={isExpanded} className="w-full">
                                <button
                                    onClick={() => {
                                        setModule(item.id);
                                        if (isMobile) setIsExpanded(false);
                                    }}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group relative
                                        ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
                                        ${isExpanded ? '' : 'justify-center px-0'}
                                    `}
                                >
                                    {/* Active Glow Background (Subtle) */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeGlow"
                                            className="absolute inset-0 bg-white/50 dark:bg-white/5 rounded-lg shadow-sm"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    <div className="relative z-10 flex items-center justify-center w-5 h-5 shrink-0">
                                        {isActive ? (
                                            <Diamond size={8} className="fill-current text-indigo-500 animate-pulse" />
                                        ) : (
                                            <item.icon size={18} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
                                        )}
                                    </div>

                                    <span 
                                        className={`
                                            font-sans text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 origin-left whitespace-nowrap overflow-hidden relative z-10
                                            ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}
                                            ${isActive ? 'font-bold' : ''}
                                        `}
                                    >
                                        {item.label}
                                    </span>
                                </button>
                            </Tooltip>
                        );
                    })}
                </div>
            ))}
        </div>

        {/* SYSTEM FOOTER */}
        <div className="shrink-0 p-6">
            <div className={`flex items-center gap-4 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center flex-col gap-6'}`}>
                
                {/* ROLE RING (Identity) */}
                <Tooltip content={role.toUpperCase()} side="right">
                    <div 
                        className={`w-8 h-8 rounded-full border-2 bg-transparent flex items-center justify-center relative cursor-pointer group ${ROLE_COLORS[role]}`}
                        onClick={() => { setModule(Module.PROFILE); if(isMobile) setIsExpanded(false); }}
                    >
                        <div className="w-2 h-2 bg-current rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Tooltip>

                {isExpanded && (
                    <div className="flex-1 overflow-hidden">
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            SYSTEM
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Tooltip content={syncStatus === 'synced' ? 'Синхронизировано' : 'Статус облака'}>
                                <button onClick={!isDriveConnected ? onConnectDrive : undefined} className="flex items-center gap-1.5 group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${getSyncColor()}`} />
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors uppercase">
                                        {syncStatus === 'synced' ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                )}

                {/* LEARNING LINK */}
                <Tooltip content="Практикум" side="right">
                    <button 
                        onClick={() => { setModule(Module.LEARNING); if(isMobile) setIsExpanded(false); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <FlaskConical size={16} strokeWidth={1.5} />
                    </button>
                </Tooltip>

                {/* SETTINGS LINK */}
                <Tooltip content="Настройки" side="right">
                    <button 
                        onClick={() => { setModule(Module.USER_SETTINGS); if(isMobile) setIsExpanded(false); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <Settings size={16} strokeWidth={1.5} />
                    </button>
                </Tooltip>
                
                {isOwner && isExpanded && (
                    <Tooltip content="Владелец" side="top">
                        <button 
                            onClick={() => { setModule(Module.SETTINGS); if(isMobile) setIsExpanded(false); }}
                            className="text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                            <Shield size={16} strokeWidth={1.5} />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500">
         <AnimatePresence mode="wait">
            <motion.div
                key={currentModule}
                initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(5px)', scale: 1.02 }}
                transition={{ 
                    duration: 0.5, 
                    ease: [0.2, 0, 0.2, 1] 
                }}
                className="flex-1 min-h-0 flex flex-col"
            >
                {children}
            </motion.div>
         </AnimatePresence>
      </main>
    </div>
  );
};
export default Layout;
