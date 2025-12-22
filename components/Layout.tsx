
import React, { useState, useEffect } from 'react';
import { Module, SyncStatus } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Trophy, Book, FlaskConical, PanelLeftClose, PanelLeftOpen, Shield, Menu, Flame } from 'lucide-react';
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
  // FIX: Initialize state based on window width immediately to prevent "flash" of expanded sidebar on mobile
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set initial mobile state
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse on resize to mobile, but don't auto-expand on desktop if user collapsed it
      if (mobile && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: Module.NAPKINS, icon: StickyNote, label: 'Заметки', color: 'indigo' },
    { id: Module.SANDBOX, icon: Box, label: 'Хаб', color: 'amber' },
    { id: Module.KANBAN, icon: KanbanIcon, label: 'Спринты', color: 'emerald' },
    { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Скиллы', color: 'indigo' },
    { id: Module.RITUALS, icon: Flame, label: 'Трекер', color: 'orange' },
    { id: Module.JOURNAL, icon: Book, label: 'Дневник', color: 'cyan' },
    { id: Module.ARCHIVE, icon: Trophy, label: 'Зал славы', color: 'slate' },
    { id: Module.LEARNING, icon: FlaskConical, label: 'Практикум', color: 'slate' },
  ];

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw size={16} className="animate-spin text-amber-500" />;
      case 'synced': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'disconnected': default: return <CloudOff size={16} className="text-slate-400 dark:text-slate-500" />;
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
            className="fixed bottom-6 left-4 z-40 p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-lg shadow-slate-300 dark:shadow-slate-900/50 md:hidden hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
            title="Меню"
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
        {/* HEADER / LOGO (Fixed Top) */}
        <div className="shrink-0">
          <div className={`h-16 md:h-20 flex items-center border-b border-slate-100 dark:border-slate-700/50 transition-all duration-300 ${isExpanded ? 'px-6 justify-between' : 'justify-center px-0'}`}>
             <div className="flex items-center overflow-hidden whitespace-nowrap">
                <div className="w-8 h-8 bg-slate-900 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 transition-transform duration-300 hover:scale-105 shadow-sm shadow-slate-300 dark:shadow-none">L</div>
                
                <div className={`transition-all duration-300 origin-left overflow-hidden ${isExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'}`}>
                    <div className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 leading-none">LIVE.ACT</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider mt-0.5">PRO v2.0</div>
                </div>
             </div>

             {isExpanded && (
                 <button 
                    onClick={() => setIsExpanded(false)} 
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                 >
                    <PanelLeftClose size={18} />
                 </button>
             )}
          </div>

          {!isExpanded && (
              <div className="w-full hidden md:flex justify-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <Tooltip content="Развернуть" position="right">
                    <button 
                        onClick={() => setIsExpanded(true)} 
                        className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <PanelLeftOpen size={18} />
                    </button>
                  </Tooltip>
              </div>
          )}
        </div>

        {/* NAV ITEMS (Scrollable Middle) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0">
          <nav className="p-3 space-y-2 mt-2">
            {navItems.map(item => (
              <Tooltip 
                key={item.id} 
                content={!isExpanded ? item.label : null} 
                position="right"
                color={item.color as any}
                className="block w-full"
              >
                <button 
                    onClick={() => {
                        setModule(item.id);
                        if (isMobile) setIsExpanded(false);
                    }} 
                    className={`
                        w-full flex items-center p-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                        ${currentModule === item.id 
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-200 dark:shadow-slate-900/50' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
                        ${isExpanded ? 'justify-start' : 'justify-center'}
                    `}
                >
                    {/* Active Indicator Background */}
                    {currentModule === item.id && (
                        <motion.div
                            layoutId="activeNav"
                            className="absolute inset-0 bg-slate-900 dark:bg-indigo-600 z-0 rounded-xl"
                            initial={false}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                    )}

                    <item.icon size={20} className={`shrink-0 transition-colors relative z-10 ${currentModule === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
                    
                    <span 
                        className={`
                            font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out relative z-10
                            ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 ml-0 absolute'}
                        `}
                    >
                        {item.label}
                    </span>
                    
                    {!isExpanded && currentModule === item.id && (
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-1 top-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-20" 
                        />
                    )}
                </button>
              </Tooltip>
            ))}
          </nav>
        </div>

        {/* FOOTER ACTIONS (Fixed Bottom) */}
        <div className="shrink-0 p-3 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
             <Tooltip content={!isExpanded ? "Облако" : null} position="right" className="block w-full">
                <button 
                    onClick={!isDriveConnected ? onConnectDrive : undefined} 
                    disabled={isDriveConnected && syncStatus === 'synced'} 
                    className={`
                        w-full flex items-center p-3 rounded-xl transition-all duration-200 relative overflow-hidden
                        ${!isDriveConnected ? 'hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer' : 'cursor-default'}
                        ${isExpanded ? 'justify-start' : 'justify-center'}
                    `} 
                >
                    <div className="relative shrink-0">
                        <Cloud size={20} className={isDriveConnected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full ring-2 ring-white dark:ring-slate-800">{getSyncIcon()}</div>
                    </div>
                    
                    <div className={`flex flex-col items-start overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 h-0 ml-0'}`}>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Облако</span>
                    </div>
                </button>
             </Tooltip>

             <Tooltip content={!isExpanded ? "Настройки" : null} position="right" className="block w-full">
                 <button 
                    onClick={() => {
                        setModule(Module.USER_SETTINGS);
                        if (isMobile) setIsExpanded(false);
                    }} 
                    className={`
                        w-full flex items-center p-3 rounded-xl transition-all duration-200 relative
                        ${currentModule === Module.USER_SETTINGS ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
                        ${isExpanded ? 'justify-start' : 'justify-center'}
                    `}
                 >
                      {currentModule === Module.USER_SETTINGS && (
                          <motion.div layoutId="activeNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                      )}
                      <Settings size={20} className="shrink-0 relative z-10" />
                      <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>Настройки</span>
                 </button>
             </Tooltip>

             {isOwner && (
               <Tooltip content={!isExpanded ? "Владелец" : null} position="right" color="red" className="block w-full">
                   <button 
                    onClick={() => {
                        setModule(Module.SETTINGS);
                        if (isMobile) setIsExpanded(false);
                    }} 
                    className={`
                        w-full flex items-center p-3 rounded-xl transition-all duration-200 relative
                        ${currentModule === Module.SETTINGS ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
                        ${isExpanded ? 'justify-start' : 'justify-center'}
                    `}
                   >
                      {currentModule === Module.SETTINGS && (
                          <motion.div layoutId="activeNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                      )}
                      <Shield size={20} className="shrink-0 relative z-10" />
                      <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>Владелец</span>
                   </button>
               </Tooltip>
             )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      {/* ADDED min-h-0 to child motion.div to prevent flex overflow issues */}
      <main className="flex-1 flex flex-col w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500">
         <AnimatePresence mode="wait">
            <motion.div
                key={currentModule}
                initial={{ opacity: 0, filter: 'blur(4px)', y: 5 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, filter: 'blur(2px)', y: -5 }}
                transition={{ 
                    duration: 0.4, 
                    ease: [0.2, 0, 0.2, 1] // Very soft cubic bezier
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
