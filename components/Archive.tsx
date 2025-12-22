import React, { useMemo } from 'react';
import { Task } from '../types';
import { History, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const archivedTasks = useMemo(() => tasks.filter(t => t.isArchived), [tasks]);

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <header className="mb-6">
          <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Зал славы</h1>
          <p className="text-sm text-slate-500">Архив достижений и завершенных дел.</p>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar-light">
        {archivedTasks.length === 0 ? (
          <div className="py-10">
              <EmptyState 
                  icon={History} 
                  title="Все впереди!" 
                  description="Немного конфетти для мотивации." 
                  color="orange"
              />
          </div>
        ) : (
          <div className="space-y-3">
              {archivedTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100 transition-opacity flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          <span className="text-slate-600 dark:text-slate-400 line-through decoration-slate-300">{task.content}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => restoreTask(task.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Восстановить">
                              <RefreshCw size={16} />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить навсегда">
                              <Trash2 size={16} />
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