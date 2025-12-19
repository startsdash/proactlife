
import React from 'react';
import { UserProfile, SyncStatus } from '../types';
import { LogOut, LogIn, User, Shield, Cloud, CheckCircle2, AlertCircle, RefreshCw, X, ArrowLeft } from 'lucide-react';

interface Props {
  user?: UserProfile;
  syncStatus: SyncStatus;
  isDriveConnected: boolean;
  onConnect: () => void;
  onSignOut: () => void;
  onClose?: () => void;
}

const UserSettings: React.FC<Props> = ({ user, syncStatus, isDriveConnected, onConnect, onSignOut, onClose }) => {
  
  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'synced': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold uppercase"><CheckCircle2 size={12}/> Синхронизировано</span>;
      case 'syncing': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold uppercase"><RefreshCw size={12} className="animate-spin"/> Синхронизация...</span>;
      case 'error': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase"><AlertCircle size={12}/> Ошибка синхронизации</span>;
      default: return <span className="flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold uppercase"><Cloud size={12}/> Локальный режим</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-4 md:p-8 animate-in fade-in duration-300">
      <header className="mb-8 flex items-center justify-between">
        <div>
           <h1 className="text-2xl md:text-3xl font-light text-slate-800 tracking-tight">Настройки</h1>
           <p className="text-slate-500 mt-2 text-sm">Управление профилем и данными.</p>
        </div>
        {onClose && (
            <button onClick={onClose} className="md:hidden p-2 bg-white border border-slate-200 rounded-full text-slate-400">
                <X size={20} />
            </button>
        )}
      </header>

      <div className="max-w-xl w-full mx-auto space-y-6">
          {/* PROFILE CARD */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-50">
                 {user ? <Shield className="text-indigo-100" size={100} /> : <User className="text-slate-100" size={100} />}
             </div>
             
             <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl shadow-inner overflow-hidden border-4 border-white shadow-slate-200">
                   {user?.picture ? (
                       <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                   ) : (
                       <User size={40} className="text-slate-300" />
                   )}
                </div>
                <div className="flex-1">
                   <h2 className="text-xl font-bold text-slate-800 mb-1">{user ? user.name : 'Гостевой режим'}</h2>
                   <p className="text-sm text-slate-500 mb-3">{user ? user.email : 'Данные хранятся только в браузере.'}</p>
                   <div className="flex justify-center md:justify-start mb-6">
                      {getSyncStatusBadge()}
                   </div>
                   
                   {user ? (
                       <button 
                         onClick={() => { if(confirm("Вы уверены, что хотите выйти?")) onSignOut(); }}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl font-medium text-sm transition-colors w-full md:w-auto"
                       >
                           <LogOut size={16} /> Выйти из профиля
                       </button>
                   ) : (
                       <button 
                         onClick={onConnect}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-indigo-200 w-full md:w-auto"
                       >
                           <LogIn size={16} /> Войти через Google
                       </button>
                   )}
                </div>
             </div>
          </div>

          {/* INFO CARD */}
          {!user && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                  <Cloud size={20} className="shrink-0 mt-0.5" />
                  <div>
                      <p className="font-bold mb-1">Зачем входить?</p>
                      <p className="opacity-80 leading-relaxed">Синхронизация с Google Drive позволит вам использовать приложение на разных устройствах и не потерять данные при очистке кэша браузера.</p>
                  </div>
              </div>
          )}

          {/* VERSION INFO */}
          <div className="text-center text-xs text-slate-300 pt-8 font-mono">
              LIVE.ACT Pro v2.0.0
          </div>
      </div>
    </div>
  );
};

export default UserSettings;
