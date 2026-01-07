import React, { useState, useEffect } from 'react';
import { Module, SyncStatus, IdentityRole, Habit, AppConfig, AccessControl } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Trophy, Book, FlaskConical, PanelLeftClose, PanelLeftOpen, Shield, Menu, Flame, LayoutDashboard, Fingerprint, Diamond, Activity, Tablet, BrainCircuit, User } from 'lucide-react';
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
  config: AppConfig;
  userEmail?: string;
}

const NAV_GROUPS = [
  {
    id: '01_НАЧАЛО',
    items: [
      { id: Module.NAPKINS, icon: StickyNote, label: 'Заметки' },
      { id: Module.SANDBOX, icon: Box, label: 'Хаб' },
    ]
  },
  {
    id: '02_ФЛОУ',
    items: [
      { id: Module.KANBAN, icon: KanbanIcon, label: 'Спринты' },
      { id: Module.RITUALS, icon: Flame, label: 'Трекер' },
      { id: Module.JOURNAL, icon: Book, label: 'Дневник' },
    ]
  },
  {
    id: '03_АРХИВЫ',
    items: [
      { id: Module.ARCHIVE, icon: Trophy, label: 'Зал славы' },
    ]
  },
  {
    id: '04_LAB',
    items: [
      { id: Module.SKETCHPAD, icon: Tablet, label: 'Скетчпад' },
      { id: Module.ETHER, icon: BrainCircuit, label: 'Ether' },
      { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Скиллы' },
      { id: Module.PROFILE, icon: User, label: 'Профиль' },
    ]
  }
];

const ROLE_COLORS: Record<IdentityRole, string> = {
    hero: 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    explorer: 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    architect: 'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
};

const SidebarAccumulator = ({ habits, expanded, onNavigate }: { habits: Habit[], expanded: boolean, onNavigate: (m: Module) => void }) => {
    const [isGlitching, setIsGlitching] = useState(false);
    
    const getLocalDateKey = (date: Date) => {
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
    };
    
    const todayKey = getLocalDateKey(new Date());
    const activeHabits = habits.filter(h => !h.isArchived);
    const activeCount = activeHabits.length;
    
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

    const percent = activeCount > 0 ? (completedCount / activeCount) * 100 : 0;
    
    // Rhythm Decay Logic
    const hour = new Date().getHours();
    // Decay if late in the day with low progress
    const isDecaying = (hour >= 12 && percent === 0) || (hour >= 18 && percent < 30);
    
    // Liquid segments proportional to TOTAL active habits
    const prodPercent = activeCount > 0 ? (sphereStats['productivity'] || 0) / activeCount * 100 : 0;
    const growthPercent = activeCount > 0 ? (sphereStats['growth'] || 0) / activeCount * 100 : 0;
    const relPercent = activeCount > 0 ? (sphereStats['relationships'] || 0) / activeCount * 100 : 0;
    const otherPercent = activeCount > 0 ? (sphereStats['default'] || 0) / activeCount * 100 : 0;
    
    if (activeCount === 0) return null;

    const handleClick = () => {
        setIsGlitching(true);
        setTimeout(() => {
            setIsGlitching(false);
            onNavigate(Module.RITUALS);
        }, 300);
    };

    if (expanded) {
        return (
            <div className="px-6 py-4 mb-2 animate-in fade-in slide-in-from-left-4 duration-500 relative group/acc">
                <button 
                    onClick={handleClick}
                    className={`
                        relative w-full h-10 rounded-full 
                        bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl 
                        border border-white/20 dark:border-white/10 
                        shadow-lg overflow-hidden group transition-all duration-300
                        ${isDecaying ? 'opacity-40 hover:opacity-100' : 'opacity-100'}
                        ${isGlitching ? 'scale-95 brightness-150 shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 'hover:scale-[1.02]'}
                    `}
                >
                    {/* Decay Filament Effect */}
                    {isDecaying && (
                        <div className="absolute inset-0 bg-rose-500/10 animate-pulse z-0" />
                    )}

                    {/* Glitch Scanline */}
                    {isGlitching && (
                        <div className="absolute inset-0 z-50 bg-white mix-blend-overlay animate-ping" />
                    )}

                    {/* Inner Atmosphere / Gloss */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-20 mix-blend-overlay" />
                    
                    {/* PLASMA LIQUID (Horizontal) */}
                    <div className={`absolute inset-0 flex items-center px-1 filter blur-[6px] opacity-90 ${isDecaying ? 'grayscale-[50%]' : ''}`}>
                         <motion.div 
                            className="h-6 bg-indigo-500 rounded-full mix-blend-screen dark:mix-blend-normal shadow-[0_0_10px_#6366f1]" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${prodPercent}%` }} 
                            transition={{ type: "spring", stiffness: 40, damping: 15 }} 
                         />
                         <motion.div 
                            className="h-6 bg-emerald-500 rounded-full mix-blend-screen dark:mix-blend-normal -ml-1 shadow-[0_0_10px_#10b981]" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${growthPercent}%` }} 
                            transition={{ type: "spring", stiffness: 40, damping: 15 }} 
                         />
                         <motion.div 
                            className="h-6 bg-rose-500 rounded-full mix-blend-screen dark:mix-blend-normal -ml-1 shadow-[0_0_10px_#f43f5e]" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${relPercent}%` }} 
                            transition={{ type: "spring", stiffness: 40, damping: 15 }} 
                         />
                         <motion.div 
                            className="h-6 bg-slate-400 dark:bg-slate-600 rounded-full mix-blend-screen dark:mix-blend-normal -ml-1" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${otherPercent}%` }} 
                            transition={{ type: "spring", stiffness: 40, damping: 15 }} 
                         />
                    </div>

                    {/* Hard Edge Overlay (Definition) */}
                    <div className="absolute inset-0 flex items-center px-1 opacity-30 z-10">
                         <motion.div 
                            className="h-0.5 bg-white rounded-full shadow-[0_0_8px_white]" 
                            animate={{ width: `${percent}%` }} 
                            transition={{ type: "spring", stiffness: 50, damping: 20 }} 
                         />
                    </div>

                    {/* Label Overlay - No fading on hover */}
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity">
                        <span className={`font-mono text-[9px] font-bold text-slate-600 dark:text-slate-300 mix-blend-difference tracking-widest drop-shadow-md ${isDecaying ? 'animate-pulse text-rose-500' : ''}`}>
                            {isDecaying ? 'SIGNAL_WEAK' : `ЭНЕРГИЯ ${Math.round(percent)}%`}
                        </span>
                    </div>
                </button>
            </div>
        )
    }

    return (
        <div className="flex justify-center py-4 mb-2 w-full animate-in fade-in zoom-in-95 duration-300">
            <button 
                onClick={handleClick}
                className={`
                    relative w-3 h-14 rounded-full 
                    bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl 
                    border border-white/20 dark:border-white/10 
                    shadow-lg overflow-hidden flex flex-col-reverse items-center py-0.5
                    hover:scale-110 hover:w-4 transition-all duration-300
                    ${isGlitching ? 'brightness-150' : ''}
                `}
            >
                    {/* PLASMA LIQUID (Vertical Stack) */}
                <div className={`absolute bottom-0.5 w-full flex flex-col-reverse items-center filter blur-[3px] opacity-90 ${isDecaying ? 'opacity-40' : ''}`}>
                        <motion.div className="w-1.5 bg-indigo-500 rounded-full shadow-[0_0_5px_#6366f1]" initial={{ height: 0 }} animate={{ height: `${prodPercent}%` }} transition={{ duration: 1 }} />
                        <motion.div className="w-1.5 bg-emerald-500 rounded-full -mb-0.5 shadow-[0_0_5px_#10b981]" initial={{ height: 0 }} animate={{ height: `${growthPercent}%` }} transition={{ duration: 1 }} />
                        <motion.div className="w-1.5 bg-rose-500 rounded-full -mb-0.5 shadow-[0_0_5px_#f43f5e]" initial={{ height: 0 }} animate={{ height: `${relPercent}%` }} transition={{ duration: 1 }} />
                        <motion.div className="w-1.5 bg-slate-400 dark:bg-slate-600 rounded-full -mb-0.5" initial={{ height: 0 }} animate={{ height: `${otherPercent}%` }} transition={{ duration: 1 }} />
                </div>
            </button>
        </div>
    );
}

const Layout: React.FC<Props> = ({ currentModule, setModule, children, syncStatus, onConnectDrive, isDriveConnected, isOwner, role, habits, config, userEmail }) => {
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

  const renderSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw size={14} className="text-amber-500 animate-spin" />;
      case 'synced': return <Cloud size={14} className="text-emerald-500" />;
      case 'error': return <CloudOff size={14} className="text-red-500" />;
      case 'disconnected': default: return <CloudOff size={14} className="text-red-400 opacity-80" />;
    }
  };

  const isModuleVisible = (moduleId: string) => {
      const moduleConfig = config.modules?.find(m => m.id === moduleId);
      
      // Feature Toggle Check (Higher priority than Access Control)
      if (moduleConfig?.isDisabled) return false;

      // Access Control
      if (isOwner) return true; // Owner sees all enabled modules
      
      // If no config found, assume public (default behavior for safety/migration)
      if (!moduleConfig) return true;

      const level = moduleConfig.accessLevel || 'public';
      
      if (level === 'public') return true;
      if (level === 'owner_only') return false; 
      if (level === 'restricted') return moduleConfig.allowedEmails?.includes(userEmail || '') || false;
      return true;
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      
      {/* SIDEBAR (Desktop) */}
      <aside 
        className={`${isExpanded ? 'w-64' : 'w-20'} hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-xl transition-all duration-300 z-50`}
        onMouseEnter={() => !isExpanded && setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* LOGO */}
        <div className={`p-6 flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} shrink-0`}>
          <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 font-bold text-lg shadow-lg">L</div>
          {isExpanded && <span className="font-sans font-bold text-lg tracking-tight">LIVE.ACT</span>}
        </div>

        {/* ACCUMULATOR */}
        <SidebarAccumulator habits={habits} expanded={isExpanded} onNavigate={setModule} />

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar-none">
          {NAV_GROUPS.map(group => {
             const visibleItems = group.items.filter(item => isModuleVisible(item.id));
             if (visibleItems.length === 0) return null;

             return (
              <div key={group.id}>
                {isExpanded && <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider opacity-80">{group.id.split('_')[1]}</div>}
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = currentModule === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setModule(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                          ${isActive 
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                          }
                          ${!isExpanded ? 'justify-center' : ''}
                        `}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
                        {isExpanded && <span className="text-sm font-medium">{item.label}</span>}
                        {!isExpanded && (
                            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
             )
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
            {isExpanded ? (
                <div className="flex items-center justify-between px-2">
                    <button onClick={onConnectDrive} className="flex items-center gap-3 group outline-none">
                        <div className={`p-1.5 rounded-lg transition-colors ${
                            syncStatus === 'synced' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 
                            syncStatus === 'syncing' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                            'bg-red-50 dark:bg-red-900/20'
                        }`}>
                            {syncStatus === 'synced' ? (
                                <Cloud size={16} className="text-emerald-500" />
                            ) : syncStatus === 'syncing' ? (
                                <RefreshCw size={16} className="text-amber-500 animate-spin" />
                            ) : (
                                <CloudOff size={16} className="text-red-500" />
                            )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                            Облако
                        </span>
                    </button>
                    {/* Settings & User Icons */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => setModule(Module.USER_SETTINGS)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <div className={`w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center overflow-hidden ${ROLE_COLORS[role]}`}>
                                {config.isGuestModeEnabled && !isDriveConnected ? (
                                    <div className="text-[10px] font-bold text-slate-500">G</div>
                                ) : (
                                    <User size={12} className="text-slate-500" />
                                )}
                            </div>
                        </button>
                        {isOwner && (
                            <button onClick={() => setModule(Module.SETTINGS)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <Settings size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <button onClick={onConnectDrive} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        {renderSyncIcon()}
                    </button>
                    <button onClick={() => setModule(Module.USER_SETTINGS)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
                        <User size={16} />
                    </button>
                </div>
            )}
        </div>
      </aside>

      {/* MOBILE NAV (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 safe-area-pb">
        <div className="flex justify-around items-center p-2">
          {/* Main Modules for Mobile */}
          {[Module.NAPKINS, Module.KANBAN, Module.SANDBOX, Module.RITUALS, Module.JOURNAL].map(moduleId => {
             const item = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === moduleId);
             if (!item || !isModuleVisible(item.id)) return null;
             const Icon = item.icon;
             const isActive = currentModule === item.id;
             return (
               <button 
                 key={moduleId}
                 onClick={() => setModule(moduleId)}
                 className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
               >
                 <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                 <span className="text-[9px] font-medium">{item.label}</span>
               </button>
             );
          })}
          <button 
             onClick={() => setModule(Module.USER_SETTINGS)}
             className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentModule === Module.USER_SETTINGS ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
           >
             <Menu size={20} />
             <span className="text-[9px] font-medium">Меню</span>
           </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-hidden flex flex-col md:pb-0 pb-[70px]">
        {children}
      </main>

    </div>
  );
};

export default Layout;