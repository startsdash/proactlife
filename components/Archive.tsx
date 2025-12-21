import React from 'react';
import { Task } from '../types';
import { History, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const archivedTasks = tasks.filter(t => t.isArchived).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
      <header className="mb-6 shrink-0">
         <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Архив <span className="text-slate-400 text-base md:text-lg">/ История</span></h1>
         <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Завершенные дела и забытые планы.</p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0">
        {archivedTasks.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center">
              <EmptyState 
                 icon={History} 
                 title="Архив пуст" 
                 description="Здесь будут храниться выполненные или отложенные задачи."
                 color="slate"
              />
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {archivedTasks.map(task => (
                 <div key={task.id} className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm opacity-75 hover:opacity-100 transition-opacity flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">
                           {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        {task.column === 'done' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed line-clamp-4 flex-1">
                       {task.content}
                    </p>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 dark:border-slate-700">
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             if (window.confirm("Восстановить задачу в 'Сделано'?")) restoreTask(task.id);
                           }}
                           className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                           title="Восстановить в Действия"
                        >
                           <RotateCcw size={14} /> <span className="hidden md:inline">Восстановить</span>
                        </button>
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             if (window.confirm("Удалить задачу из истории навсегда?")) deleteTask(task.id);
                           }}
                           className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                           title="Удалить навсегда"
                        >
                           <Trash2 size={14} /> <span className="hidden md:inline">Удалить</span>
                        </button>
                     </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Archive;