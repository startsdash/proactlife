
import React from 'react';
import { UserProfile, SyncStatus } from '../types';
import { LogOut, LogIn, User, Shield, Cloud, CheckCircle2, AlertCircle, RefreshCw, X, Moon, Sun } from 'lucide-react';

interface Props {
  user?: UserProfile;
  syncStatus: SyncStatus;
  isDriveConnected: boolean;
  onConnect: () => void;
  onSignOut: () => void;
  onClose?: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const UserSettings: React.FC<Props> = ({ user, syncStatus, isDriveConnected, onConnect, onSignOut, onClose, theme, toggleTheme }) => {
  
  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'synced': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase"><CheckCircle2 size={12}/> Синхронизировано</span>;
      case 'syncing': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded text-[10px] font-bold uppercase"><RefreshCw size={12} className="animate-spin"/> Синхронизация...</span>;
      case 'error': return <span className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-[10px] font-bold uppercase"><AlertCircle size={12}/> Ошибка синхронизации</span>;
      default: return <span className="flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-1 rounded text-[10px] font-bold uppercase"><Cloud size={12}/> Локальный режим</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 animate-in fade-in duration-300">
      <header className="mb-8 flex items-center justify-between">
        <div>
           <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Настройки</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Управление профилем и данными.</p>
        </div>
        {onClose && (
            <button onClick={onClose} className="md:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 dark:text-slate-500">
                <X size={20} />
            </button>
        )}
      </header>

      <div className="max-w-xl w-full mx-auto space-y-6">
          {/* PROFILE CARD */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-50">
                 {user ? <Shield className="text-indigo-100 dark:text-indigo-900/50" size={100} /> : <User className="text-slate-100 dark:text-slate-800" size={100} />}
             </div>
             
             <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-3xl shadow-inner overflow-hidden border-4 border-white dark:border-slate-600 shadow-slate-200 dark:shadow-none">
                   {user?.picture ? (
                       <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                   ) : (
                       <User size={40} className="text-slate-300 dark:text-slate-500" />
                   )}
                </div>
                <div className="flex-1">
                   <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">{user ? user.name : 'Гостевой режим'}</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{user ? user.email : 'Данные хранятся только в браузере.'}</p>
                   <div className="flex justify-center md:justify-start mb-6">
                      {getSyncStatusBadge()}
                   </div>
                   
                   {user ? (
                       <button 
                         onClick={() => { if(confirm("Вы уверены, что хотите выйти?")) onSignOut(); }}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-medium text-sm transition-colors w-full md:w-auto"
                       >
                           <LogOut size={16} /> Выйти из профиля
                       </button>
                   ) : (
                       <button 
                         onClick={onConnect}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-indigo-200 dark:shadow-none w-full md:w-auto"
                       >
                           <LogIn size={16} /> Войти через Google
                       </button>
                   )}
                </div>
             </div>
          </div>

          {/* THEME TOGGLE */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-amber-100 text-amber-600'}`}>
                      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Тема оформления</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{theme === 'dark' ? 'Темная тема' : 'Светлая тема'}</p>
                  </div>
              </div>
              <button 
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                  <span 
                    className={`${theme === 'dark' ? 'translate-x-6 bg-indigo-500' : 'translate-x-1 bg-white'} inline-block h-4 w-4 transform rounded-full transition-transform`}
                  />
              </button>
          </div>

          {/* INFO CARD */}
          {!user && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex gap-3 text-blue-800 dark:text-blue-300 text-sm">
                  <Cloud size={20} className="shrink-0 mt-0.5" />
                  <div>
                      <p className="font-bold mb-1">Зачем входить?</p>
                      <p className="opacity-80 leading-relaxed">Синхронизация с Google Drive позволит вам использовать приложение на разных устройствах и не потерять данные при очистке кэша браузера.</p>
                  </div>
              </div>
          )}

          {/* VERSION INFO */}
          <div className="text-center text-xs text-slate-300 dark:text-slate-600 pt-8 font-mono">
              LIVE.ACT Pro v2.0.0
          </div>
      </div>
    </div>
  );
};

export default UserSettings;
