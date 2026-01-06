
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

// --- THE MINI-REACTOR (SIDEBAR ACCUMULATOR) ---
const SidebarAccumulator = ({ habits, expanded, onNavigate }: { habits: Habit[], expanded: boolean, onNavigate: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [clicked, setClicked] = useState(false);

    const getLocalDateKey = (date: Date) => {
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
    };
    
    const todayKey = getLocalDateKey(new Date());
    const activeHabits = habits.filter(h => !h.isArchived);
    const activeCount = activeHabits.length;
    
    if (activeCount === 0) return null;

    // Stats Calculation
    const sphereStats: Record<string, number> = { productivity: 0, growth: 0, relationships: 0, default: 0 };
    let completedCount = 0;

    activeHabits.forEach(h => {
        if (h.history[todayKey]) {
            completedCount++;
            const sphere = h.spheres?.[0] || 'default';
            sphereStats[sphere] = (sphereStats[sphere] || 0) + 1;
        }
    });

    const percent = (completedCount / activeCount) * 100;
    
    // Determine Dominant Sphere Color
    let dominantColor = 'bg-slate-400 dark:bg-slate-500 shadow-slate-400/50';
    let maxVal = 0;
    
    if (sphereStats.productivity > maxVal) { maxVal = sphereStats.productivity; dominantColor = 'bg-indigo-500 shadow-indigo-500/50'; }
    if (sphereStats.growth > maxVal) { maxVal = sphereStats.growth; dominantColor = 'bg-emerald-500 shadow-emerald-500/50'; }
    if (sphereStats.relationships > maxVal) { maxVal = sphereStats.relationships; dominantColor = 'bg-rose-500 shadow-rose-500/50'; }
    
    // Idle State Logic (Visual simulation: if 0% progress, assume idle "decay")
    const isIdle = percent === 0;

    const handleClick = () => {
        setClicked(true);
        setTimeout(() => setClicked(false), 300);
        onNavigate();
    };

    return (
        <div 
            className={`w-full px-6 mb-6 transition-all duration-500 ${expanded ? 'py-4 opacity-100' : 'py-4 flex justify-center opacity-100'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className={`relative group cursor-pointer ${expanded ? 'w-full' : 'w-8'}`}>
                {/* Glass Capsule Container */}
                <div className={`
                    h-1.5 rounded-full 
                    bg-slate-200/50 dark:bg-white/5 
                    backdrop-blur-sm border border-slate-300/50 dark:border-white/10 
                    overflow-hidden relative
                    transition-all duration-300
                    ${isHovered ? 'border-slate-400/50 dark:border-white/20' : ''}
                `}>
                    {/* The Liquid Light Filament */}
                    <motion.div 
                        className={`h-full rounded-full ${dominantColor} shadow-[0_0_10px_currentColor]`}
                        initial={{ width: 0, opacity: 0.5 }}
                        animate={{ 
                            width: `${Math.max(percent, isIdle ? 15 : 0)}%`, // Always show a faint spark if idle
                            opacity: isIdle ? [0.2, 0.5, 0.2] : 1 // Breathing effect if idle
                        }}
                        transition={{ 
                            width: { type: "spring", stiffness: 60, damping: 20 },
                            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                    />
                    
                    {/* Scanline Glitch Effect on Click */}
                    <AnimatePresence>
                        {clicked && (
                            <motion.div 
                                className="absolute inset-0 bg-white/80 dark:bg-white/80 mix-blend-overlay"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, ease: "linear" }}
                            />
                        )}
                    </AnimatePresence>
                </div>

                {/* Ghost Tooltip (Only when expanded) */}
                <AnimatePresence>
                    {isHovered && expanded && (
                        <motion.div 
                            initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                            className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none"
                        >
                            <div className="px-2 py-1 bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded text-[7px] font-mono text-slate-500 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap shadow-sm">
                                [ SYSTEM_SYNC: {Math.round(percent)}% // {isIdle ? 'IDLE' : 'ACTIVE'} ]
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

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

        {/* ACCUMULATOR WIDGET (The Heartbeat) */}
        <SidebarAccumulator habits={habits} expanded={isExpanded} onNavigate={() => setModule(Module.RITUALS)} />

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
