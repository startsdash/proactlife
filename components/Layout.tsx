
import React from 'react';
import { Module, SyncStatus } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Settings, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, History, Book } from 'lucide-react';

interface Props {
  currentModule: Module;
  setModule: (m: Module) => void;
  children: React.ReactNode;
  syncStatus: SyncStatus;
  onConnectDrive: () => void;
  isDriveConnected: boolean;
  isOwner: boolean; // NEW PROP
}

const Layout: React.FC<Props> = ({ currentModule, setModule, children, syncStatus, onConnectDrive, isDriveConnected, isOwner }) => {
  const navItems = [
    { id: Module.NAPKINS, icon: StickyNote, label: 'Салфетки' },
    { id: Module.SANDBOX, icon: Box, label: 'Песочница' },
    { id: Module.MENTAL_GYM, icon: Dumbbell, label: 'Mental Gym' },
    { id: Module.KANBAN, icon: KanbanIcon, label: 'Действия' },
    { id: Module.JOURNAL, icon: Book, label: 'Дневник' },
    { id: Module.ARCHIVE, icon: History, label: 'Архив' },
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
      <aside className="w-16 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-all duration-300 z-50">
        <div>
          <div className="h-16 md:h-20 flex flex-col justify-center items-center md:items-start md:px-8 border-b border-slate-100">
             <div className="flex items-center"><div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">L</div><span className="ml-3 font-bold text-lg tracking-tight hidden md:block">LIVE.ACT</span></div>
             <span className="hidden md:block text-[10px] text-slate-400 mt-1 ml-11 font-mono">PRO v2.0</span>
          </div>
          <nav className="p-2 md:p-4 space-y-2">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setModule(item.id)} className={`w-full flex items-center justify-center md:justify-start p-3 rounded-xl transition-all duration-200 group ${currentModule === item.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <item.icon size={20} className={currentModule === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                <span className="ml-3 font-medium hidden md:block">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-2 md:p-4 space-y-2 border-t border-slate-100">
             <button onClick={!isDriveConnected ? onConnectDrive : undefined} disabled={isDriveConnected && syncStatus === 'synced'} className={`w-full flex items-center justify-center md:justify-start p-3 rounded-xl transition-all duration-200 ${!isDriveConnected ? 'hover:bg-indigo-50 cursor-pointer' : 'cursor-default'}`} title="Резервное копирование">
                <div className="relative"><Cloud size={20} className={isDriveConnected ? 'text-indigo-500' : 'text-slate-400'} /><div className="absolute -bottom-1 -right-1 bg-white rounded-full">{getSyncIcon()}</div></div>
                <div className="ml-3 hidden md:flex flex-col items-start"><span className="text-sm font-medium text-slate-700">Backup</span><span className="text-[10px] text-slate-400 uppercase tracking-wide">{syncStatus === 'synced' ? 'Saved' : 'Connect'}</span></div>
             </button>
             {isOwner && (
               <button onClick={() => setModule(Module.SETTINGS)} className={`w-full flex items-center justify-center md:justify-start p-3 rounded-xl transition-all duration-200 ${currentModule === Module.SETTINGS ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Settings size={20} />
                  <span className="ml-3 text-sm font-medium hidden md:block">Владелец</span>
               </button>
             )}
        </div>
      </aside>
      <main className="flex-1 flex flex-col w-full relative overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
};
export default Layout;
