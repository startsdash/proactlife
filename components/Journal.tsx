import React, { useState, useMemo } from 'react';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { Book, Calendar, Search, Plus, Trash2, Bot, Sparkles } from 'lucide-react';
import EmptyState from './EmptyState';
import { generateJournalReflection } from '../services/geminiService';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (a: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId: string | null;
  onClearInitialTask: () => void;
  onNavigateToTask: (id: string) => void;
}

const Journal: React.FC<Props> = ({ 
  entries, tasks, config, addEntry, deleteEntry, updateEntry, initialTaskId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [hasActiveDateFilter, setHasActiveDateFilter] = useState(false);
  const [isReflecting, setIsReflecting] = useState(false);

  const displayedEntries = useMemo(() => {
      let res = [...entries].sort((a, b) => b.date - a.date);
      if (searchQuery) {
          res = res.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return res;
  }, [entries, searchQuery]);

  const handleCreate = async () => {
      if (!newEntryContent.trim()) return;
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          content: newEntryContent,
          date: Date.now(),
          linkedTaskId: initialTaskId || undefined
      };
      
      // Auto reflection
      setIsReflecting(true);
      const linkedTask = tasks.find(t => t.id === newEntry.linkedTaskId);
      const reflection = await generateJournalReflection(newEntry.content, linkedTask, config);
      
      const entryWithFeedback = { ...newEntry, aiFeedback: reflection.feedback, mentorId: reflection.mentorId };
      addEntry(entryWithFeedback);
      
      setNewEntryContent('');
      setIsReflecting(false);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Дневник</h1>
                <p className="text-sm text-slate-500">Хроники Пути.</p>
             </div>
             <div className="relative w-full md:w-64">
                 <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по записям..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                 />
                 <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
             </div>
        </header>

        {/* Input Area */}
        <div className="mb-8 relative">
             <textarea 
                value={newEntryContent}
                onChange={(e) => setNewEntryContent(e.target.value)}
                placeholder={initialTaskId ? "Как прошла работа над задачей?" : "Запиши мысли, инсайты или итоги дня..."}
                className="w-full p-4 pr-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm resize-none h-32 outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 dark:text-slate-200"
             />
             <button 
                onClick={handleCreate}
                disabled={!newEntryContent.trim() || isReflecting}
                className="absolute right-3 bottom-3 p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
             >
                {isReflecting ? <Bot className="animate-bounce" /> : <Plus />}
             </button>
             {initialTaskId && (
                 <div className="absolute top-2 right-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                     Контекст: Задача
                 </div>
             )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar-light">
        {displayedEntries.length === 0 ? (
           <div className="py-10">
               <EmptyState 
                   icon={Book} 
                   title="Страницы пусты" 
                   description={searchQuery || hasActiveDateFilter ? 'Ничего не найдено по вашему запросу.' : 'Записывай свои мысли, связывай их с задачами, чтобы отслеживать свой путь.'}
                   color="cyan"
               />
           </div>
        ) : (
           <div className="space-y-6 pb-20">
               {displayedEntries.map(entry => (
                   <div key={entry.id} className="relative pl-8 md:pl-0">
                       {/* Timeline Line (Desktop) */}
                       <div className="hidden md:block absolute top-0 left-24 w-px h-full bg-slate-200 dark:bg-slate-800" />
                       <div className="hidden md:block absolute top-6 left-24 w-3 h-3 -ml-1.5 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900" />

                       <div className="flex flex-col md:flex-row gap-4 md:gap-12 group">
                           {/* Date */}
                           <div className="md:w-24 shrink-0 pt-4 text-right">
                               <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(entry.date).toLocaleDateString()}</div>
                               <div className="text-xs text-slate-400">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           </div>

                           {/* Content Card */}
                           <div className="flex-1 bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                               <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{entry.content}</div>
                               
                               {entry.aiFeedback && (
                                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                       <Sparkles size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                                       <div className="text-sm text-indigo-900 dark:text-indigo-300 italic">
                                           "{entry.aiFeedback}"
                                       </div>
                                   </div>
                               )}

                               <button 
                                   onClick={() => deleteEntry(entry.id)} 
                                   className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                   <Trash2 size={16} />
                                </button>
                           </div>
                       </div>
                   </div>
               ))}
           </div>
        )}
        </div>
    </div>
  );
};

export default Journal;