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
import { motion, AnimatePresence } from 'framer-motion';
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

// --- HELPER COMPONENTS ---
const SphereSelector = ({ selected, onChange }: { selected: string[], onChange: (s: string[]) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {SPHERES.map(s => (
      <button
        key={s.id}
        onClick={() => onChange(selected.includes(s.id) ? selected.filter(id => id !== s.id) : [...selected, s.id])}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
          selected.includes(s.id)
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}
      >
        {s.label}
      </button>
    ))}
  </div>
);

const TaskSelect = ({ tasks, selectedId, onSelect }: { tasks: Task[], selectedId: string, onSelect: (id: string) => void }) => (
  <select
    value={selectedId}
    onChange={(e) => onSelect(e.target.value)}
    className="text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none text-slate-600 dark:text-slate-400"
  >
    <option value="">Без задачи</option>
    {tasks.filter(t => t.column !== 'done').map(t => (
      <option key={t.id} value={t.id}>{t.content || t.title}</option>
    ))}
  </select>
);

export const Journal: React.FC<Props> = ({
  entries,
  tasks,
  addEntry,
  deleteEntry,
}) => {
  const [newContent, setNewContent] = useState('');
  const [newSpheres, setNewSpheres] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddEntry = () => {
    if (!newContent.trim()) return;
    addEntry({
      id: Date.now().toString(),
      content: newContent,
      spheres: newSpheres,
      taskId: selectedTaskId || undefined,
      createdAt: Date.now(),
    });
    setNewContent('');
    setNewSpheres([]);
    setSelectedTaskId('');
  };

  const filteredEntries = entries.filter(e => 
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] pb-20">
      {/* КЛЮЧЕВОЙ КОНТЕЙНЕР: 
          max-w-4xl — ограничивает ширину, mx-auto — центрирует, 
          w-full и px-4 — задают одинаковые отступы для всех вложенных элементов.
      */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-12">
        
        {/* СЕКЦИЯ ПОИСКА */}
        <div className="mb-8">
          <div className="relative group">
            {/* pl-4 здесь задает положение иконки */}
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            {/* pl-11 дает место для иконки, текст поиска начнется чуть дальше */}
            <input
              type="text"
              placeholder="Поиск записей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* СЕКЦИЯ СОЗДАНИЯ ЗАПИСИ */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all focus-within:border-indigo-500/50">
            {/* px-4 здесь совпадает с pl-4 у поиска. 
                Это гарантирует, что текст "Что у тебя на уме?" начнется ровно под иконкой лупы.
            */}
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
                <TaskSelect tasks={tasks} selectedId={selectedTaskId} onSelect={setSelectedTaskId} />
              </div>
              
              <button
                onClick={handleAddEntry}
                disabled={!newContent.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm font-medium shadow-sm shadow-indigo-500/20"
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
              <div 
                key={entry.id} 
                className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-2">
                    {entry.spheres.map(s => (
                      <span key={s} className="text-[10px] font-bold uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                        {SPHERES.find(sp => sp.id === s)?.label}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    <Calendar size={12} />
                    {new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message={searchQuery ? "Ничего не найдено" : "Дневник пока пуст"} />
          )}
        </div>
      </div>
    </div>
  );
};