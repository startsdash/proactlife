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

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ (Оставляем как в оригинале) ---

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

  // Синхронизация с начальной задачей
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
      {/* ЕДИНЫЙ КОНТЕЙНЕР ВЫРАВНИВАНИЯ */}
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-12">
        
        {/* ШАПКА И ПОИСК */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Book className="text-indigo-500" size={28} />
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
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* БЛОК СОЗДАНИЯ ЗАПИСИ */}
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
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
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

        {/* СПИСОК ЗАПИСЕЙ */}
        <div className="space-y-6">
          {filteredEntries.length > 0 ? (
            filteredEntries.map(entry => (
              <div key={entry.id} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-2">
                    {entry.spheres.map(s => (
                      <span key={s} className="text-[10px] font-bold uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                        {SPHERES.find(sp => sp.id === s)?.label}
                      </span>
                    ))}
                    {entry.taskId && (
                      <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Target size={10} />
                        Задача
                      </span>
                    )}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    {new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message={searchQuery ? "Ничего не найдено" : "Напишите первую мысль в дневник"} />
          )}
        </div>
      </div>
    </div>
  );
};