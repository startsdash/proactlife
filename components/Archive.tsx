
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task } from '../types';
import { RotateCcw, Trash2, History, Calendar, CheckCircle2, FileText, X, Zap, MessageCircle, Circle, XCircle, Trophy, Minus, Plus, Search, Medal } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-200 leading-relaxed" {...props} />,
    // ... (Keep other components standard)
};

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const archivedTasks = tasks
    .filter(t => t.isArchived)
    .filter(t => t.content.toLowerCase().includes(searchQuery.toLowerCase()) || t.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative">
      <header className="p-6 md:p-8 pb-0 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                Зал Славы <Trophy className="text-amber-400" size={24} />
            </h1>
            <p className="text-sm text-slate-500 mt-1">Твои завершенные миссии</p>
        </div>
        <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Поиск в архиве..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8">
        {archivedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center pb-20">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Medal size={40} className="text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Зал славы пуст</h3>
              <p className="text-sm text-slate-400 max-w-xs text-center mt-2">Завершай задачи и отправляй их в архив, чтобы сохранить историю своих побед.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {archivedTasks.map(task => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="break-inside-avoid bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer relative group overflow-hidden"
              >
                {/* Gold Accent for Completed Tasks */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 opacity-80" />

                <div className="flex justify-between items-start mb-3 mt-2">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                       <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                   </div>
                   <div className="p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                       <CheckCircle2 size={16} />
                   </div>
                </div>

                {task.title && <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">{task.title}</h4>}
                
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-4 leading-relaxed font-light mb-4">
                    <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Восстановить?')) restoreTask(task.id); }}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Восстановить"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Удалить навсегда?')) deleteTask(task.id); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal (Simplified for brevity, assume similar structure to others but read-only) */}
      <AnimatePresence>
        {selectedTask && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" 
                onClick={() => setSelectedTask(null)}
            >
                <motion.div 
                    initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-light text-slate-800 dark:text-white">Архивная запись</h2>
                        <button onClick={() => setSelectedTask(null)}><X size={24} className="text-slate-400" /></button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert">
                        <h3 className="font-bold">{selectedTask.title}</h3>
                        <ReactMarkdown>{selectedTask.content}</ReactMarkdown>
                    </div>
                    {/* Add more details here like history etc. */}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Archive;
