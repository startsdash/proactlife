
import React, { useState, useEffect, useMemo } from 'react';
import { Module, SyncStatus } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Trophy, Book, FlaskConical, PanelLeftClose, PanelLeftOpen, Shield, Menu, Flame, LayoutDashboard, Palette, Smile, Zap } from 'lucide-react';
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
}

const Layout: React.FC<Props> = ({ currentModule, setModule, children, syncStatus, onConnectDrive, isDriveConnected, isOwner }) => {
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

  const navItems = [
    { id: Module.NAPKINS, icon: StickyNote, label: 'Заметки' },
    { id: Module.SKETCHPAD, icon: Palette, label: 'Sketchpad' },
    { id: Module.SANDBOX, icon: Box, label: 'Хаб' },
    { id: Module.KANBAN, icon: KanbanIcon, label: 'Спринты' },
    { id: Module.RITUALS, icon: Flame, label: 'Трекер' },
    { id: Module.JOURNAL, icon: Book, label: 'Дневник' },
    { id: Module.MOODBAR, icon: Smile, label: 'Moodbar' },
    { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Скиллы' },
    { id: Module.DASHBOARD, icon: LayoutDashboard, label: 'Обзор' },
    { id: Module.ARCHIVE, icon: Trophy, label: 'Зал славы' },
    { id: Module.LEARNING, icon: FlaskConical, label: 'Практикум' },
  ];

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw size={14} className="animate-spin text-amber-500" />;
      case 'synced': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      case 'disconnected': default: return <CloudOff size={14} className="text-slate-400 dark:text-slate-500" />;
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
            className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm md:hidden"
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
            className="fixed bottom-6 left-4 z-40 p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-full shadow-lg shadow-slate-300 dark:shadow-slate-900/50 md:hidden active:scale-95"
          >
            <Menu size={24} />
          </motion.button>
      )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside 
        className={`
            bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-50
            transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
            fixed inset-y-0 left-0 h-full md:relative md:h-auto
            ${isExpanded ? 'w-64 translate-x-0 shadow-2xl md:shadow-none' : 'w-64 md:w-[72px] -translate-x-full md:translate-x-0'}
        `}
      >
        {/* HEADER */}
        <div className="shrink-0 h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-50 dark:border-slate-800">
             <div className="flex items-center overflow-hidden whitespace-nowrap gap-3">
                <div className="w-8 h-8 bg-slate-900 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">L</div>
                
                <div className={`transition-all duration-300 origin-left overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                    <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 uppercase leading-none">ProAct</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest mt-0.5">LIFE OS</div>
                </div>
             </div>

             {isExpanded ? (
                 <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><PanelLeftClose size={18} /></button>
             ) : (
                 <button onClick={() => setIsExpanded(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hidden md:block"><PanelLeftOpen size={18} /></button>
             )}
        </div>

        {/* NAV ITEMS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 py-4 px-3 space-y-1">
            {navItems.map(item => (
              <Tooltip key={item.id} content={item.label} side="right" disabled={isExpanded} className="w-full">
                  <button 
                    onClick={() => { setModule(item.id); if (isMobile) setIsExpanded(false); }} 
                    className={`
                        w-full flex items-center p-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                        ${currentModule === item.id 
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
                        ${isExpanded ? 'justify-start' : 'justify-center'}
                    `}
                  >
                    {currentModule === item.id && (
                        <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                    )}
                    <item.icon size={20} className="shrink-0 relative z-10" strokeWidth={currentModule === item.id ? 2.5 : 2} />
                    <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ml-3 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 absolute'}`}>{item.label}</span>
                  </button>
              </Tooltip>
            ))}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
             <Tooltip content="Облако" side="right" disabled={isExpanded} className="w-full">
                 <button onClick={!isDriveConnected ? onConnectDrive : undefined} disabled={isDriveConnected && syncStatus === 'synced'} className={`w-full flex items-center p-2 rounded-xl transition-all ${!isDriveConnected ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : ''} ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                    <div className="relative shrink-0">
                        <Cloud size={20} className={isDriveConnected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400'} />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1e293b] rounded-full">{getSyncIcon()}</div>
                    </div>
                    {isExpanded && <span className="ml-3 text-xs font-medium text-slate-600 dark:text-slate-400">Sync Status</span>}
                 </button>
             </Tooltip>

             <Tooltip content="Настройки" side="right" disabled={isExpanded} className="w-full">
                 <button onClick={() => setModule(Module.USER_SETTINGS)} className={`w-full flex items-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                      <Settings size={20} className="shrink-0" />
                      {isExpanded && <span className="ml-3 text-xs font-medium">Settings</span>}
                 </button>
             </Tooltip>

             {isOwner && (
               <Tooltip content="Владелец" side="right" disabled={isExpanded} className="w-full">
                   <button onClick={() => setModule(Module.SETTINGS)} className={`w-full flex items-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                      <Shield size={20} className="shrink-0" />
                      {isExpanded && <span className="ml-3 text-xs font-medium">Admin</span>}
                   </button>
               </Tooltip>
             )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
         <AnimatePresence mode="wait">
            <motion.div
                key={currentModule}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
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
