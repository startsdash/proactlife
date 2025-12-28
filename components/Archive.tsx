
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Task } from '../types';
import { RotateCcw, Trash2, Calendar, Trophy, Medal, Star } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const archivedTasks = tasks.filter(t => t.isArchived).sort((a, b) => b.createdAt - a.createdAt);
  const totalArchived = archivedTasks.length;

  return (
    <div className="h-full p-8 bg-[#f8fafc] dark:bg-[#0f172a] overflow-y-auto custom-scrollbar-light">
      {/* HEADER STATS */}
      <div className="flex items-end justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
              <h1 className="text-3xl font-light text-slate-800 dark:text-slate-100 tracking-tight">Зал Славы</h1>
              <p className="text-slate-500 text-sm mt-1">История твоих побед</p>
          </div>
          <div className="flex gap-6">
              <div className="text-right">
                  <div className="text-3xl font-bold text-slate-800 dark:text-white flex items-center justify-end gap-2">
                      <Trophy size={24} className="text-amber-500" /> {totalArchived}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Миссий выполнено</div>
              </div>
          </div>
      </div>

      {totalArchived === 0 ? (
          <EmptyState icon={Trophy} title="Пустота" description="Заверши миссии, чтобы увидеть их здесь" color="amber" />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {archivedTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group relative flex flex-col h-64">
                      {/* Decorative Seal */}
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg rotate-12">
                          <Star size={16} fill="white" />
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                          <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex-1 overflow-hidden">
                          <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed line-clamp-6">
                              <ReactMarkdown components={{ p: ({node, ...props}: any) => <p className="mb-1" {...props} /> }}>
                                  {task.content}
                              </ReactMarkdown>
                          </div>
                      </div>

                      <div className="pt-4 mt-auto border-t border-slate-50 dark:border-slate-800 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => restoreTask(task.id)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><RotateCcw size={12}/> Восстановить</button>
                          <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default Archive;
