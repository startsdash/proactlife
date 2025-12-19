
import React from 'react';
import { UserProfile, SyncStatus } from '../types';
import { Settings, Cloud, LogOut, Trash2, User, HardDrive, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  user?: UserProfile;
  syncStatus: SyncStatus;
  isDriveConnected: boolean;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void; // Placeholder for future logic if needed, currently resets auth state locally
  onClearData: () => void;
  version: string;
}

const UserSettings: React.FC<Props> = ({ user, syncStatus, isDriveConnected, onConnectDrive, onDisconnectDrive, onClearData, version }) => {
  
  const getSyncStatusUI = () => {
    switch (syncStatus) {
      case 'syncing': return <div className="flex items-center gap-2 text-amber-600"><RefreshCw size={16} className="animate-spin" /> <span>Синхронизация...</span></div>;
      case 'synced': return <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={16} /> <span>Синхронизировано</span></div>;
      case 'error': return <div className="flex items-center gap-2 text-red-600"><AlertCircle size={16} /> <span>Ошибка синхронизации</span></div>;
      case 'disconnected': default: return <div className="flex items-center gap-2 text-slate-400"><Cloud size={16} /> <span>Не подключено</span></div>;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 tracking-tight flex items-center gap-3">
            <Settings className="text-slate-400" size={32} />
            <span>Настройки</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">Управление аккаунтом и данными.</p>
      </header>

      <div className="space-y-6">
        
        {/* PROFILE SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} /> Профиль
            </h2>
            
            {user ? (
                <div className="flex items-center gap-4">
                    {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full border-2 border-slate-100" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
                            {user.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="text-lg font-bold text-slate-800">{user.name}</div>
                        <div className="text-sm text-slate-500 font-mono">{user.email}</div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-4 text-slate-500">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={24} className="text-slate-400" />
                    </div>
                    <div>
                        <div className="text-lg font-medium">Гостевой режим</div>
                        <div className="text-sm text-slate-400">Войдите через Google для синхронизации.</div>
                    </div>
                </div>
            )}
        </div>

        {/* SYNC SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Cloud size={14} /> Облачное хранилище (Google Drive)
            </h2>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="text-sm font-medium">
                    {getSyncStatusUI()}
                </div>
                
                {!isDriveConnected ? (
                    <button 
                        onClick={onConnectDrive}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Cloud size={16} /> Подключить Google Drive
                    </button>
                ) : (
                    <div className="text-xs text-slate-400 italic">
                        Автоматическое резервное копирование активно.
                    </div>
                )}
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
                Приложение сохраняет файл <code>live_act_pro_backup.json</code> в корне вашего Google Диска. Это позволяет синхронизировать данные между устройствами.
            </p>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <HardDrive size={14} /> Управление данными
            </h2>
            
            <p className="text-sm text-slate-600 mb-6">
                Вы можете полностью очистить локальные данные приложения. Если синхронизация отключена, данные будут утеряны безвозвратно.
            </p>

            <button 
                onClick={() => {
                    if (window.confirm("ВНИМАНИЕ: Это действие удалит все локальные данные (заметки, задачи, настройки). Вы уверены?")) {
                        onClearData();
                    }
                }}
                className="w-full md:w-auto px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
                <Trash2 size={16} /> Сбросить приложение и удалить данные
            </button>
        </div>

        <div className="text-center pt-8 pb-4">
             <div className="text-xs text-slate-300 font-mono">LIVE.ACT Pro v{version}</div>
        </div>

      </div>
    </div>
  );
};

export default UserSettings;
