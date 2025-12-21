import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry } from '../types';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { Kanban as KanbanIcon, Book, Zap, MessageCircle, History, Circle, CheckCircle2, MoreHorizontal, Loader2, X } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask?: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
}

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [challengeDrafts, setChallengeDrafts] = useState<Record<string, string>>({});
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [therapySession, setTherapySession] = useState<{taskId: string, content: string, response?: string, isLoading: boolean} | null>(null);

  // Filter out archived tasks
  const activeTasks = tasks.filter(t => !t.isArchived);

  // Columns definition
  const columns = [
    { id: 'todo', label: 'Очередь', color: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-500' },
    { id: 'doing', label: 'В процессе', color: 'bg-indigo-50 dark:bg-indigo-900/10', textColor: 'text-indigo-500' },
    { id: 'done', label: 'Сделано', color: 'bg-emerald-50 dark:bg-emerald-900/10', textColor: 'text-emerald-500' }
  ];

  const hasChallengeAuthors = config.challengeAuthors && config.challengeAuthors.some(a => !a.isDisabled);
  const hasKanbanTherapist = config.aiTools && config.aiTools.some(t => t.id === 'kanban_therapist' && !t.isDisabled);

  useEffect(() => {
     if (initialTaskId) {
         // Logic to scroll to task could go here
         onClearInitialTask?.();
     }
  }, [initialTaskId, onClearInitialTask]);

  const moveTask = (task: Task, newCol: 'todo' | 'doing' | 'done') => {
      updateTask({ ...task, column: newCol });
  };

  const generateChallenge = async (e: React.MouseEvent, taskId: string, content: string) => {
      e.stopPropagation();
      setGeneratingChallengeFor(taskId);
      const challenge = await generateTaskChallenge(content, config);
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          updateTask({ 
              ...task, 
              activeChallenge: challenge,
              isChallengeCompleted: false
          });
      }
      setGeneratingChallengeFor(null);
  };

  const openTherapy = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      setTherapySession({ taskId: task.id, content: task.content, isLoading: true });
      getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config).then(res => {
          setTherapySession(prev => prev ? { ...prev, response: res, isLoading: false } : null);
      });
  };

  const closeTherapy = () => setTherapySession(null);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
      <header className="mb-6 shrink-0">
         <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Действия <span className="text-emerald-500 text-base md:text-lg">/ Поток</span></h1>
         <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">От намерения к результату.</p>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar-light min-h-0">
         <div className="flex h-full gap-6 min-w-[800px] md:min-w-0">
             {columns.map(col => {
                 const colTasks = activeTasks.filter(t => t.column === col.id);
                 return (
                     <div key={col.id} className="flex-1 flex flex-col min-w-[280px] h-full">
                         <div className={`flex items-center justify-between mb-4 px-2`}>
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${col.textColor}`}>{col.label}</h3>
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                         </div>
                         
                         <div className={`flex-1 rounded-2xl ${col.color} border border-slate-200/50 dark:border-slate-700/50 p-3 overflow-y-auto custom-scrollbar-light`}>
                             {colTasks.length === 0 ? (
                                 <div className="h-full flex items-center justify-center opacity-30">
                                     <div className="text-center">
                                         <div className="w-12 h-12 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center mx-auto mb-2">
                                             <Circle size={20} className="text-slate-300 dark:text-slate-600" />
                                         </div>
                                         <p className="text-xs font-bold uppercase text-slate-400">Пусто</p>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="space-y-3">
                                     {colTasks.map(task => {
                                         const hasJournalEntry = journalEntries.some(j => j.linkedTaskId === task.id);
                                         return (
                                             <div key={task.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative">
                                                 <div className="mb-3">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{task.content}</p>
                                                    {task.activeChallenge && (
                                                        <div className={`mt-3 p-3 rounded-lg text-xs leading-relaxed ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300'}`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <strong className="uppercase text-[10px] tracking-wider opacity-70 flex items-center gap-1"><Zap size={10}/> Челлендж</strong>
                                                                {!task.isChallengeCompleted && col.id === 'doing' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); updateTask({...task, isChallengeCompleted: true}); }}
                                                                        className="p-1 hover:bg-white/50 rounded text-emerald-600" title="Завершить челлендж"
                                                                    >
                                                                        <CheckCircle2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <ReactMarkdown>{task.activeChallenge}</ReactMarkdown>
                                                        </div>
                                                    )}
                                                 </div>

                                                 <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700">
                                                     <div className="flex gap-1">
                                                         {/* Actions Logic from Snippet */}
                                                        {col.id === 'doing' && (
                                                            <>
                                                            <button 
                                                                    onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                                                    className={`p-2 rounded-lg border transition-colors ${
                                                                        hasJournalEntry 
                                                                        ? 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40' 
                                                                        : 'border-transparent text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100'
                                                                    }`}
                                                                    title={hasJournalEntry ? "В Дневнике" : "В Дневник"}
                                                            >
                                                                    <Book size={18} />
                                                            </button>

                                                            {!challengeDrafts[task.id] && hasChallengeAuthors && (
                                                                <button 
                                                                        onClick={(e) => {
                                                                            if (task.activeChallenge && !task.isChallengeCompleted) {
                                                                                e.stopPropagation();
                                                                                alert("Сначала завершите активный челлендж!");
                                                                                return;
                                                                            }
                                                                            generateChallenge(e, task.id, task.content);
                                                                        }} 
                                                                        disabled={generatingChallengeFor === task.id} 
                                                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors disabled:opacity-50"
                                                                        title="Челлендж (ИИ)"
                                                                >
                                                                        <Zap size={18} className={generatingChallengeFor === task.id ? "opacity-50" : ""} />
                                                                </button>
                                                            )}

                                                            {hasKanbanTherapist && (
                                                                <button 
                                                                        onClick={(e) => openTherapy(e, task)} 
                                                                        className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg border border-transparent hover:border-amber-100 dark:hover:border-amber-800"
                                                                        title="Консультант (ИИ)"
                                                                >
                                                                    <MessageCircle size={18} /> 
                                                                </button>
                                                            )}
                                                            </>
                                                        )}
                                                        
                                                        {col.id === 'done' && (
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        if(window.confirm('Перенести задачу в "Архив"?')) archiveTask(task.id); 
                                                                    }} 
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                                                    title="В Архив"
                                                                >
                                                                    <History size={18} /> 
                                                                </button>
                                                        )}
                                                     </div>

                                                     {/* Movement Controls */}
                                                     <div className="flex gap-1">
                                                         {col.id === 'todo' && (
                                                             <button onClick={() => moveTask(task, 'doing')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-medium rounded-lg transition-colors">Начать</button>
                                                         )}
                                                         {col.id === 'doing' && (
                                                             <button onClick={() => moveTask(task, 'done')} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-lg transition-colors">Готово</button>
                                                         )}
                                                     </div>
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             )}
                         </div>
                     </div>
                 );
             })}
         </div>
      </div>

      {/* Therapy Modal */}
      {therapySession && (
         <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                         <MessageCircle className="text-amber-500" /> ИИ-Консультант
                     </h3>
                     <button onClick={closeTherapy} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                 </div>
                 
                 <div className="mb-4 text-sm text-slate-500 italic border-l-2 border-slate-200 pl-3">
                     Контекст: "{therapySession.content}"
                 </div>

                 {therapySession.isLoading ? (
                     <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                         <Loader2 size={32} className="animate-spin mb-2 text-indigo-500" />
                         <span className="text-xs uppercase tracking-wider">Анализируем ситуацию...</span>
                     </div>
                 ) : (
                     <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
                         <ReactMarkdown>{therapySession.response || "Нет ответа"}</ReactMarkdown>
                     </div>
                 )}
                 
                 <div className="mt-6 flex justify-end">
                     <button onClick={closeTherapy} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300">Закрыть</button>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default Kanban;