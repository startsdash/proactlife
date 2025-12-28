
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Bot, Loader2, Save, Scroll, XCircle, Send, Lightbulb, Target } from 'lucide-react';
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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
};

const Journal: React.FC<Props> = ({ entries, tasks, config, addEntry, deleteEntry, updateEntry }) => {
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  
  const handlePost = () => {
    if (!content.trim()) return;
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      content: applyTypography(content),
      linkedTaskId: linkedTaskId || undefined,
      mood: 3 // Default neutral mood
    };
    addEntry(newEntry);
    setContent('');
    setLinkedTaskId('');
  };

  const sortedEntries = [...entries].sort((a, b) => b.date - a.date);

  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
        {/* WRITE AREA (LEFT) */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#1e293b] p-6 z-10 shadow-xl">
            <h1 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-6">Chronicles</h1>
            <textarea 
                className="flex-1 resize-none outline-none text-base text-slate-700 dark:text-slate-300 placeholder:text-slate-300 font-serif leading-relaxed bg-transparent"
                placeholder="О чем ты думаешь сегодня?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button onClick={handlePost} disabled={!content.trim()} className="bg-slate-900 dark:bg-indigo-600 text-white px-6 py-2 rounded-full font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">
                    Записать
                </button>
            </div>
        </div>

        {/* TIMELINE AREA (RIGHT) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-8 bg-slate-50 dark:bg-[#0f172a]">
            <div className="max-w-3xl mx-auto relative pl-8">
                {/* Vertical Timeline Line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 ml-[11px]" />

                {sortedEntries.map((entry, idx) => {
                    const task = tasks.find(t => t.id === entry.linkedTaskId);
                    const isLast = idx === sortedEntries.length - 1;
                    
                    return (
                        <div key={entry.id} className={`relative mb-8 ${isLast ? 'mb-0' : ''} group`}>
                            {/* Dot */}
                            <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 group-hover:border-indigo-500 transition-colors z-10" />
                            
                            <div className="mb-1 flex items-baseline gap-3">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {new Date(entry.date).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] text-slate-300">
                                    {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                </div>

                                {task && (
                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-3">
                                        <div className="mt-0.5"><Link size={14} className="text-indigo-400" /></div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Контекст</div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{task.content}</div>
                                        </div>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={() => deleteEntry(entry.id)} 
                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default Journal;
