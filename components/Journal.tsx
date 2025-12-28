
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Bot, Loader2, Save, Scroll, XCircle, Send, Lightbulb, Target, MoreHorizontal, ArrowRight } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-200 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-200" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-4 py-1 my-3 text-slate-500 italic" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 p-3 rounded-lg text-xs font-mono my-2 overflow-x-auto" {...props}>{children}</code>
    }
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  // Auto-select task if navigating from Kanban
  useEffect(() => {
    if (initialTaskId) {
        setLinkedTaskId(initialTaskId);
        setIsInputExpanded(true);
        onClearInitialTask?.();
    }
  }, [initialTaskId, onClearInitialTask]);

  const handlePost = () => {
    if (!content.trim()) return;
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      content: applyTypography(content),
      linkedTaskId: linkedTaskId || undefined,
      spheres: [] // Can add sphere selector to input if needed
    };
    addEntry(newEntry);
    setContent('');
    setLinkedTaskId('');
    setIsInputExpanded(false);
  };

  const filteredEntries = entries.sort((a, b) => b.date - a.date).filter(e => 
      e.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedTask = (id?: string) => tasks.find(t => t.id === id);

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        
      {/* Header */}
      <header className="p-6 md:p-8 pb-0 shrink-0 flex justify-between items-center z-10 bg-[#f8fafc]/90 dark:bg-[#0f172a]/90 backdrop-blur-md">
          <div>
              <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Дневник</h1>
              <p className="text-sm text-slate-500 mt-1">Хроника твоего пути</p>
          </div>
          <div className="relative group w-40 md:w-64 transition-all focus-within:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Поиск мыслей..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
          </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8 relative">
          <div className="max-w-3xl mx-auto pb-32">
              
              {/* Input Area */}
              <div className={`bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 mb-12 ${isInputExpanded ? 'p-6 ring-4 ring-slate-100 dark:ring-slate-800' : 'p-4'}`}>
                  {isInputExpanded && (
                      <div className="flex justify-between items-center mb-4 animate-in fade-in slide-in-from-bottom-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Новая запись</span>
                          {linkedTaskId && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                  <Link size={12} />
                                  Контекст задачи
                                  <button onClick={() => setLinkedTaskId('')} className="ml-1 hover:text-indigo-800"><X size={12}/></button>
                              </div>
                          )}
                      </div>
                  )}
                  
                  <textarea
                      placeholder="О чем ты думаешь? Чему научило это событие?"
                      className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 text-base resize-none placeholder:text-slate-400"
                      rows={isInputExpanded ? 6 : 2}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onFocus={() => setIsInputExpanded(true)}
                  />
                  
                  {isInputExpanded && (
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in">
                          <button 
                            onClick={() => { setIsInputExpanded(false); setLinkedTaskId(''); }}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                          >
                              Свернуть
                          </button>
                          <button 
                            onClick={handlePost}
                            disabled={!content.trim()}
                            className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-slate-700 dark:hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
                          >
                              Записать
                          </button>
                      </div>
                  )}
              </div>

              {/* Timeline Feed */}
              <div className="relative pl-8 md:pl-0">
                  {/* Timeline Line (Desktop Only) */}
                  <div className="hidden md:block absolute left-8 top-4 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

                  {filteredEntries.map((entry, idx) => {
                      const task = getLinkedTask(entry.linkedTaskId);
                      const isEditing = editingId === entry.id;
                      const date = new Date(entry.date);

                      return (
                          <div key={entry.id} className="relative mb-10 group">
                              {/* Timeline Dot */}
                              <div className="hidden md:flex absolute left-8 top-6 -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#0f172a] border-2 border-slate-300 dark:border-slate-600 rounded-full z-10 group-hover:border-indigo-500 group-hover:scale-110 transition-all" />

                              <div className="md:ml-20">
                                  {/* Date Header */}
                                  <div className="flex items-center gap-3 mb-2">
                                      <span className="text-sm font-bold text-slate-400">{date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                                      <span className="text-xs text-slate-300 dark:text-slate-600">{date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>

                                  {/* Entry Card */}
                                  <div className="bg-white dark:bg-[#1e293b] p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative">
                                      
                                      {/* Linked Task Context */}
                                      {task && (
                                          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center gap-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors group/task" onClick={() => onNavigateToTask?.(task.id)}>
                                              <div className={`p-1.5 rounded-full ${task.column === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                  <Kanban size={14} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Контекст</div>
                                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{task.content}</div>
                                              </div>
                                              <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover/task:opacity-100 -translate-x-2 group-hover/task:translate-x-0 transition-all" />
                                          </div>
                                      )}

                                      {/* Content */}
                                      {isEditing ? (
                                          <div>
                                              <textarea 
                                                  value={editContent} 
                                                  onChange={e => setEditContent(e.target.value)}
                                                  className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm outline-none resize-none"
                                              />
                                              <div className="flex justify-end gap-2 mt-2">
                                                  <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 text-slate-500">Отмена</button>
                                                  <button onClick={() => { updateEntry({...entry, content: editContent}); setEditingId(null); }} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg">Сохранить</button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                              <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                          </div>
                                      )}

                                      {/* AI Feedback */}
                                      {entry.aiFeedback && (
                                          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                              <div className="flex items-start gap-3">
                                                  <Bot size={16} className="text-indigo-500 mt-1 shrink-0" />
                                                  <div className="text-sm text-slate-600 dark:text-slate-400 italic">
                                                      <ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown>
                                                  </div>
                                              </div>
                                          </div>
                                      )}

                                      {/* Actions */}
                                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button onClick={() => { setEditingId(entry.id); setEditContent(entry.content); }} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors"><Edit3 size={14}/></button>
                                          <button onClick={() => { if(confirm('Удалить?')) deleteEntry(entry.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Journal;
