
import React, { useState, useEffect } from 'react';
import { Module, SyncStatus } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, History, Book, GraduationCap, PanelLeftClose, PanelLeftOpen, Shield, Menu } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.innerWidth >= 768 && !isExpanded) {
        // Keep collapsed state on desktop
      }
    };
    
    if (window.innerWidth < 768) {
        setIsExpanded(false);
        setIsMobile(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: Module.NAPKINS, icon: StickyNote, label: 'Салфетки' },
    { id: Module.SANDBOX, icon: Box, label: 'Песочница' },
    { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Mental Gym' },
    { id: Module.KANBAN, icon: KanbanIcon, label: 'Действия' },
    { id: Module.JOURNAL, icon: Book, label: 'Дневник' },
    { id: Module.ARCHIVE, icon: History, label: 'Архив' },
    { id: Module.LEARNING, icon: GraduationCap, label: 'Академия' },
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
    <div className="flex h-[100dvh] bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
      
      {/* MOBILE BACKDROP */}
      {isMobile && isExpanded && (
        <div 
            className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
        />
      )}

      {/* MOBILE OPEN BUTTON */}
      {isMobile && !isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-6 left-4 z-40 p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-lg shadow-slate-300 dark:shadow-slate-900/50 md:hidden animate-in zoom-in-95 duration-200 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
            title="Меню"
          >
            <Menu size={24} />
          </button>
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
            bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 z-50
            transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
            fixed inset-y-0 left-0 h-full md:relative md:h-auto
            ${isExpanded ? 'w-64' : 'w-64 md:w-[72px]'}
            ${isExpanded ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* HEADER / LOGO */}
          <div className={`h-16 md:h-20 flex items-center border-b border-slate-100 dark:border-slate-700/50 transition-all duration-300 ${isExpanded ? 'px-6 justify-between' : 'justify-center px-0'}`}>
             <div className="flex items-center overflow-hidden whitespace-nowrap">
                <div className="w-8 h-8 bg-slate-900 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 transition-transform duration-300 hover:scale-105 shadow-sm shadow-slate-300 dark:shadow-none">L</div>
                
                <div className={`ml-3 transition-all duration-300 origin-left ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                    <div className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 leading-none">LIVE.ACT</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider mt-0.5">PRO v2.0</div>
                </div>
             </div>

             {isExpanded && (
                 <button 
                    onClick={() => setIsExpanded(false)} 
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                 >
                    <PanelLeftClose size={18} />
                 </button>
             )}
          </div>

          {!isExpanded && (
              <div className="w-full hidden md:flex justify-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <button 
                    onClick={() => setIsExpanded(true)} 
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Развернуть"
                  >
                    <PanelLeftOpen size={18} />
                  </button>
              </div>
          )}

          {/* NAV ITEMS */}
          <nav className="p-3 space-y-2 mt-2">
            {navItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => {
                    setModule(item.id);
                    if (isMobile) setIsExpanded(false);
                }} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative
                    ${currentModule === item.id 
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-200 dark:shadow-slate-900/50' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `}
                title={!isExpanded ? item.label : undefined}
              >
                <item.icon size={20} className={`shrink-0 transition-colors ${currentModule === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
                
                <span 
                    className={`
                        ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 absolute'}
                    `}
                >
                    {item.label}
                </span>
                
                {!isExpanded && currentModule === item.id && (
                    <div className="absolute right-1 top-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
             <button 
                onClick={!isDriveConnected ? onConnectDrive : undefined} 
                disabled={isDriveConnected && syncStatus === 'synced'} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200 relative overflow-hidden
                    ${!isDriveConnected ? 'hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer' : 'cursor-default'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `} 
                title={!isExpanded ? "Облако" : undefined}
             >
                <div className="relative shrink-0">
                    <Cloud size={20} className={isDriveConnected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full ring-2 ring-white dark:ring-slate-800">{getSyncIcon()}</div>
                </div>
                
                <div className={`ml-3 flex flex-col items-start overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 h-0'}`}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Облако</span>
                </div>
             </button>

             <button 
                onClick={() => {
                    setModule(Module.USER_SETTINGS);
                    if (isMobile) setIsExpanded(false);
                }} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200
                    ${currentModule === Module.USER_SETTINGS ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `}
                title={!isExpanded ? "Настройки" : undefined}
             >
                  <Settings size={20} className="shrink-0" />
                  <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Настройки</span>
             </button>

             {isOwner && (
               <button 
                onClick={() => {
                    setModule(Module.SETTINGS);
                    if (isMobile) setIsExpanded(false);
                }} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200
                    ${currentModule === Module.SETTINGS ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `}
                title={!isExpanded ? "Настройки Владельца" : undefined}
               >
                  <Shield size={20} className="shrink-0" />
                  <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>Владелец</span>
               </button>
             )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col w-full relative overflow-x-hidden overflow-y-auto bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
         <div 
           key={currentModule} // Triggers animation on module change
           className="flex-1 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
         >
            {children}
         </div>
      </main>
    </div>
  );
};
export default Layout;
