
import React, { useState, useEffect } from 'react';
import { Module, SyncStatus } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, History, Book, GraduationCap, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, UserCog, Shield, Menu } from 'lucide-react';

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

  // Initialize state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !isExpanded) {
          // If moving to desktop and was collapsed, ensure we stick to collapsed state (which is visible on desktop)
          // No action needed really, Boolean(false) maps to "Icon Only" on desktop.
      }
    };
    
    // Set initial
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
      case 'disconnected': default: return <CloudOff size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      
      {/* MOBILE BACKDROP */}
      {isMobile && isExpanded && (
        <div 
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
        />
      )}

      {/* MOBILE OPEN BUTTON (When collapsed/hidden) */}
      {isMobile && !isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-6 left-4 z-40 p-3 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-300 md:hidden animate-in zoom-in-95 duration-200 hover:bg-slate-800 active:scale-95"
            title="Меню"
          >
            <Menu size={24} />
          </button>
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
            bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-50
            transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
            
            /* Positioning: Fixed on mobile, Relative on Desktop */
            fixed inset-y-0 left-0 h-full md:relative md:h-auto
            
            /* Width logic */
            ${isExpanded ? 'w-64' : 'w-64 md:w-[72px]'}

            /* Transform logic (Hide on mobile when collapsed) */
            ${isExpanded ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* HEADER / LOGO */}
          <div className={`h-16 md:h-20 flex items-center border-b border-slate-100 transition-all duration-300 ${isExpanded ? 'px-6 justify-between' : 'justify-center px-0'}`}>
             <div className="flex items-center overflow-hidden whitespace-nowrap">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 transition-transform duration-300 hover:scale-105 shadow-sm shadow-slate-300">L</div>
                
                {/* Text Label with Transition */}
                <div className={`ml-3 transition-all duration-300 origin-left ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                    <div className="font-bold text-lg tracking-tight text-slate-900 leading-none">LIVE.ACT</div>
                    <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">PRO v2.0</div>
                </div>
             </div>

             {/* Toggle Button (Visible when expanded) */}
             {isExpanded && (
                 <button 
                    onClick={() => setIsExpanded(false)} 
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                 >
                    <PanelLeftClose size={18} />
                 </button>
             )}
          </div>

          {/* Toggle Button for Collapsed State (Desktop Only - Centered) */}
          {!isExpanded && (
              <div className="w-full hidden md:flex justify-center py-2 border-b border-slate-50">
                  <button 
                    onClick={() => setIsExpanded(true)} 
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                    if (isMobile) setIsExpanded(false); // Auto-close on mobile selection
                }} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative
                    ${currentModule === item.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `}
                title={!isExpanded ? item.label : undefined}
              >
                <item.icon size={20} className={`shrink-0 transition-colors ${currentModule === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                
                {/* Label Animation */}
                <span 
                    className={`
                        ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 absolute'}
                    `}
                >
                    {item.label}
                </span>
                
                {/* Active Indicator Dot for Collapsed State */}
                {!isExpanded && currentModule === item.id && (
                    <div className="absolute right-1 top-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white shadow-sm" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/30">
             <button 
                onClick={!isDriveConnected ? onConnectDrive : undefined} 
                disabled={isDriveConnected && syncStatus === 'synced'} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200 relative overflow-hidden
                    ${!isDriveConnected ? 'hover:bg-indigo-50 cursor-pointer' : 'cursor-default'}
                    ${isExpanded ? 'justify-start' : 'justify-center'}
                `} 
                title={!isExpanded ? "Облако" : undefined}
             >
                <div className="relative shrink-0">
                    <Cloud size={20} className={isDriveConnected ? 'text-indigo-500' : 'text-slate-400'} />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full ring-2 ring-white">{getSyncIcon()}</div>
                </div>
                
                <div className={`ml-3 flex flex-col items-start overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 h-0'}`}>
                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Облако</span>
                </div>
             </button>

             <button 
                onClick={() => {
                    setModule(Module.USER_SETTINGS);
                    if (isMobile) setIsExpanded(false);
                }} 
                className={`
                    w-full flex items-center p-3 rounded-xl transition-all duration-200
                    ${currentModule === Module.USER_SETTINGS ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
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
                    ${currentModule === Module.SETTINGS ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
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
      <main className="flex-1 flex flex-col w-full relative overflow-x-hidden overflow-y-auto bg-[#f8fafc]">
        {children}
      </main>
    </div>
  );
};
export default Layout;
