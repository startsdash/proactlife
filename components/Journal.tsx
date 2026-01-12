import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { 
  Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, 
  Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, 
  Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, 
  Loader2, Save, Send, Target, Sparkle, Sparkles, Star, 
  XCircle, Gem, PenTool, RotateCcw, RotateCw, Bold, Italic, 
  Eraser, Image as ImageIcon, Layout, Palette, ArrowRight, 
  RefreshCw, Upload, Shuffle, Globe 
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

// --- Стили для Markdown ---
const markdownComponents = {
  p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-2">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-md font-bold mb-2 text-slate-900 dark:text-white">{children}</h3>,
  code: ({ node, inline, className, children, ...props }: any) => (
    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-sm font-mono" {...props}>{children}</code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-slate-600 dark:text-slate-400">{children}</blockquote>
  ),
};

const StaticChallengeRenderer = ({ content, mode = 'history' }: { content: string, mode?: 'history' | 'active' }) => (
    <div className={`rounded-xl ${mode === 'active' ? 'bg-indigo-50/50 dark:bg-indigo-500/5 dark:text-indigo-100 text-indigo-900 border border-indigo-100/50 dark:border-indigo-500/20' : ''}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {content}
        </ReactMarkdown>
    </div>
);

const CollapsibleSection = ({ title, icon, children, defaultOpen = false }: { title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex items-center justify-between text-left group">
        <div className="flex items-center gap-3">
          <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">{icon}</div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="pb-6 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SphereSelector = ({ selected, onChange }: { selected: string[], onChange: (spheres: string[]) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {SPHERES.map(sphere => (
      <button
        key={sphere.id}
        onClick={() => {
          const newSpheres = selected.includes(sphere.id)
            ? selected.filter(s => s !== sphere.id)
            : [...selected, sphere.id];
          onChange(newSpheres);
        }}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
          selected.includes(sphere.id)
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
        }`}
      >
        {sphere.label}
      </button>
    ))}
  </div>
);

const TaskSelect = ({ tasks, selectedId, onSelect }: { tasks: Task[], selectedId: string, onSelect: (id: string) => void }) => (
  <select
    value={selectedId}
    onChange={(e) => onSelect(e.target.value)}
    className="text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500"
  >
    <option value="">Без задачи</option>
    {tasks.filter(t => t.column !== 'done').map(t => (
      <option key={t.id} value={t.id}>{t.content || t.title}</option>
    ))}
  </select>
);

export const Journal: React.FC<Props> = ({
  entries,
  mentorAnalyses,
  tasks,
  config,
  addEntry,
  deleteEntry,
  updateEntry,
  addMentorAnalysis,
  deleteMentorAnalysis,
  initialTaskId,
  onClearInitialTask,
  onNavigateToTask
}) => {
  const [newContent, setNewContent] = useState('');
  const [newSpheres, setNewSpheres] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (initialTaskId) setSelectedTaskId(initialTaskId);
  }, [initialTaskId]);

  const handleAddEntry = () => {
    if (!newContent.trim()) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      content: newContent,
      spheres: newSpheres,
      taskId: selectedTaskId || undefined,
      createdAt: Date.now(),
    };
    addEntry(entry);
    setNewContent('');
    setNewSpheres([]);
    setSelectedTaskId(null);
    if (onClearInitialTask) onClearInitialTask();
  };

  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => {
        const matchesSearch = e.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSpheres = selectedSpheres.length === 0 || e.spheres.some(s => selectedSpheres.includes(s));
        return matchesSearch && matchesSpheres;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, searchQuery, selectedSpheres]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] pb-20">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-12">
        
        {/* Поиск и Фильтры */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
              <Book className="text-indigo-500" size={24} />
              Дневник
            </h1>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Поиск по записям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {SPHERES.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSpheres(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  selectedSpheres.includes(s.id)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Форма создания записи */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Что у тебя на уме?"
              className="w-full px-4 pt-6 pb-4 md:px-6 bg-transparent outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-h-[140px] text-base leading-relaxed"
            />
            
            <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SphereSelector selected={newSpheres} onChange={setNewSpheres} />
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                <TaskSelect tasks={tasks} selectedId={selectedTaskId || ''} onSelect={setSelectedTaskId} />
              </div>
              
              <button
                onClick={handleAddEntry}
                disabled={!newContent.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-md"
              >
                <Send size={16} />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Список записей */}
        <div className="space-y-6">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-2">
                    {entry.spheres.map(s => (
                      <span key={s} className="text-[10px] font-bold uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                        {SPHERES.find(sp => sp.id === s)?.label}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <Trash2 size={16} />
                  </button>
               </div>
               <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
               <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                    <Calendar size={12} />
                    {new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
               </div>
            </div>
          ))}
          {filteredEntries.length === 0 && <EmptyState message="Записей не найдено" />}
        </div>
      </div>

      {/* Модальное окно просмотра задачи (если есть в коде) */}
      {viewingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{viewingTask.content || viewingTask.title}</h2>
                    <button onClick={() => setViewingTask(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                </div>
                <div className="space-y-6 text-slate-600 dark:text-slate-400">
                    {viewingTask.challenges && viewingTask.challenges.length > 0 && (
                        <CollapsibleSection title="Активные вызовы" icon={<Zap size={14}/>} defaultOpen={true}>
                             <div className="space-y-4">
                                {viewingTask.challenges.map((challenge, index) => (
                                   <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                         <StaticChallengeRenderer content={challenge} mode="history" />
                                      </div>
                                   </div>
                                ))}
                             </div>
                        </CollapsibleSection>
                    )}
                    {viewingTask.consultationHistory && viewingTask.consultationHistory.length > 0 && (
                       <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                            <ul className="space-y-4">
                                {viewingTask.consultationHistory.map((consultation, index) => (
                                    <li key={index} className="text-sm text-slate-900 dark:text-slate-200 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                        <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                                    </li>
                                ))}
                            </ul>
                       </CollapsibleSection>
                    )}
                </div>
                <div className="mt-8 flex justify-end">
                    <button onClick={() => setViewingTask(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm">Закрыть</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};