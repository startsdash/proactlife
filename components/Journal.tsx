
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Masonry from 'react-masonry-css';
import { JournalEntry, AppConfig, MentorAnalysis, Task, Note } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { 
    Book, 
    Plus, 
    Search, 
    Filter, 
    Calendar, 
    Sparkles, 
    Trash2, 
    Edit2, 
    X, 
    Check, 
    ChevronDown, 
    Target, 
    Link as LinkIcon, 
    Bot,
    ArrowRight,
    RotateCcw,
    Quote,
    RefreshCw,
    Save,
    PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  notes: Note[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToNote: (noteId: string) => void;
}

// --- HELPERS ---

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const wrap = (text: string, marker: string) => {
        const match = text.match(/^(\s*)(.*?)(\s*)$/s);
        if (match && match[2]) {
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text.trim() ? `${marker}${text}${marker}` : '';
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) return wrap(content, '**');
            if (el.style.fontStyle === 'italic') return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'div': return content ? `\n${content}` : '\n'; 
                case 'p': return `\n${content}\n`;
                case 'br': return '\n';
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return applyTypography(md);
};

const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    
    // Simple formatting
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        if (line.match(/^<(div|p|ul|ol|li|blockquote)/i)) return line;
        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
    });
    
    return processedLines.join('');
};

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all outline-none ${
                  isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">Не выбрано</span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, notes, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote }) => {
  const [activeTab, setActiveTab] = useState<'entries' | 'insights'>('entries');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSphere, setFilterSphere] = useState<string | null>(null);
  
  // Editor State
  const creationContentEditableRef = useRef<HTMLDivElement>(null);
  const [creationHistory, setCreationHistory] = useState<string[]>(['']);
  const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
  const creationHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSelectionRange = useRef<Range | null>(null);

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
      if (initialTaskId) {
          setIsCreatorOpen(true);
          // Pre-fill link logic could go here if we had a proper linking UI in the creator
          // For now just open the creator
          onClearInitialTask?.();
      }
  }, [initialTaskId, onClearInitialTask]);

  // Editor Helpers
  const saveCreationSnapshot = useCallback((content: string) => {
      if (content === creationHistory[creationHistoryIndex]) return;
      const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 20) newHistory.shift();
      setCreationHistory(newHistory);
      setCreationHistoryIndex(newHistory.length - 1);
  }, [creationHistory, creationHistoryIndex]);

  const handleCreationInput = () => {
      if (creationHistoryTimeoutRef.current) clearTimeout(creationHistoryTimeoutRef.current);
      creationHistoryTimeoutRef.current = setTimeout(() => {
          if (creationContentEditableRef.current) {
              saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
          }
      }, 500);
  };

  const handleEditorClick = () => {
      saveSelection();
  };

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
          lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
      }
  };

  const handleSaveEntry = () => {
      const html = creationContentEditableRef.current?.innerHTML || '';
      const text = htmlToMarkdown(html);
      
      if (!text.trim()) return;

      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content: text,
          spheres: selectedSpheres,
          isInsight: false,
          linkedTaskId: initialTaskId || undefined
      };

      addEntry(newEntry);
      
      // Reset
      if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
      setCreationHistory(['']);
      setCreationHistoryIndex(0);
      setSelectedSpheres([]);
      setIsCreatorOpen(false);
  };

  const handleAnalyze = async () => {
      setIsAnalyzing(true);
      try {
          // Get last 10 entries
          const recentEntries = [...entries].sort((a,b) => b.date - a.date).slice(0, 10);
          const result = await analyzeJournalPath(recentEntries, config);
          
          addMentorAnalysis({
              id: Date.now().toString(),
              date: Date.now(),
              content: result,
              mentorName: 'AI Mentor'
          });
          
          setActiveTab('insights');
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const filteredEntries = entries.filter(e => {
      if (searchQuery && !e.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterSphere && !e.spheres?.includes(filterSphere)) return false;
      return true;
  }).sort((a, b) => b.date - a.date);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0 p-4 md:p-8 pb-4">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                  <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники Пути</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start md:self-auto">
                  <button onClick={() => setActiveTab('entries')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'entries' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Записи</button>
                  <button onClick={() => setActiveTab('insights')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'insights' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Инсайты</button>
              </div>
          </header>

          {/* CREATOR TOGGLE */}
          {!isCreatorOpen ? (
              <button 
                  onClick={() => { setIsCreatorOpen(true); setTimeout(() => creationContentEditableRef.current?.focus(), 100); }}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all group bg-slate-50/50 dark:bg-slate-800/30"
              >
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Plus size={20} className="text-indigo-500" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest font-bold">Новая запись</span>
              </button>
          ) : (
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Book size={16} /> Сегодня, {new Date().toLocaleDateString()}
                      </h3>
                      <button onClick={() => setIsCreatorOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                <Target size={10} strokeWidth={1} /> Сферы
                            </label>
                            <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                        </div>
                  </div>
                                    
                  <div className="relative">
                        <div 
                            ref={creationContentEditableRef}
                            contentEditable 
                            onInput={handleCreationInput} 
                            onClick={handleEditorClick}
                            onBlur={saveSelection}
                            onMouseUp={saveSelection}
                            onKeyUp={saveSelection}
                            className="w-full h-40 md:h-56 overflow-y-auto outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-slate-500"
                            data-placeholder="О чем ты думаешь?"
                        />
                        <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                  </div>

                  <div className="flex justify-end pt-4 gap-3">
                      <button onClick={() => setIsCreatorOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">Отмена</button>
                      <button onClick={handleSaveEntry} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2">
                          <Save size={14} /> Сохранить
                      </button>
                  </div>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
          <AnimatePresence mode="wait">
              {activeTab === 'entries' ? (
                  <motion.div 
                    key="entries"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                      {/* FILTERS */}
                      <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-none">
                          <div className="relative flex-1 min-w-[200px]">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="text" 
                                placeholder="Поиск записей..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors"
                              />
                          </div>
                          <button onClick={() => setFilterSphere(null)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${!filterSphere ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-500'}`}>Все</button>
                          {SPHERES.map(s => (
                              <button 
                                key={s.id} 
                                onClick={() => setFilterSphere(filterSphere === s.id ? null : s.id)} 
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-1 ${filterSphere === s.id ? `bg-${s.color}-50 border-${s.color}-200 text-${s.color}-600` : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-500'}`}
                              >
                                  {filterSphere === s.id && <Check size={12} />} {s.label}
                              </button>
                          ))}
                      </div>

                      {filteredEntries.length === 0 ? (
                          <EmptyState icon={Book} title="Дневник пуст" description="Начни записывать свои мысли и опыт" color="cyan" />
                      ) : (
                          <Masonry breakpointCols={{ default: 2, 700: 1 }} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                              {filteredEntries.map(entry => (
                                  <div key={entry.id} className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow mb-6 group relative">
                                      <div className="flex justify-between items-start mb-4">
                                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                              <Calendar size={12} />
                                              <span>{new Date(entry.date).toLocaleDateString()}</span>
                                              <span className="opacity-50">|</span>
                                              <span>{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </div>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 size={14}/></button>
                                          </div>
                                      </div>

                                      <div className="font-serif text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                                              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                                          }}>{applyTypography(entry.content)}</ReactMarkdown>
                                      </div>

                                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-2">
                                          {entry.spheres?.map(sid => {
                                              const s = SPHERES.find(x => x.id === sid);
                                              return s ? (
                                                  <span key={sid} className={`text-[9px] px-2 py-1 rounded border uppercase tracking-wider font-bold ${s.bg} ${s.text} ${s.border}`}>
                                                      {s.label}
                                                  </span>
                                              ) : null;
                                          })}
                                          {entry.linkedTaskId && (
                                              <button onClick={() => onNavigateToTask(entry.linkedTaskId!)} className="text-[9px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 uppercase tracking-wider font-bold flex items-center gap-1 transition-colors">
                                                  <LinkIcon size={10} /> Task Link
                                              </button>
                                          )}
                                          {entry.linkedNoteId && (
                                              <button onClick={() => onNavigateToNote(entry.linkedNoteId!)} className="text-[9px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 uppercase tracking-wider font-bold flex items-center gap-1 transition-colors">
                                                  <LinkIcon size={10} /> Note Link
                                              </button>
                                          )}
                                          {entry.mood && (
                                              <span className="text-[9px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                                                  Mood: {entry.mood}/5
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </Masonry>
                      )}
                  </motion.div>
              ) : (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-white dark:bg-indigo-900 rounded-full shadow-sm">
                                  <Sparkles size={24} className="text-indigo-500" />
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">ИИ Анализ Пути</h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">Получи глубокий разбор своих записей от ментора</p>
                              </div>
                          </div>
                          <button 
                            onClick={handleAnalyze} 
                            disabled={isAnalyzing}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                              {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
                              {isAnalyzing ? 'Анализирую...' : 'Запустить Анализ'}
                          </button>
                      </div>

                      {mentorAnalyses.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                              <Bot size={48} className="mx-auto mb-4 opacity-20" />
                              <p>Нет аналитических отчетов</p>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              {mentorAnalyses.map(analysis => (
                                  <div key={analysis.id} className="bg-white dark:bg-[#1e293b] rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                                          <Quote size={120} />
                                      </div>
                                      
                                      <div className="flex justify-between items-center mb-6 relative z-10">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                  <Bot size={20} className="text-slate-600 dark:text-slate-300" />
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-slate-800 dark:text-white">{analysis.mentorName}</div>
                                                  <div className="text-xs text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                              </div>
                                          </div>
                                          <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                              <Trash2 size={18} />
                                          </button>
                                      </div>

                                      <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-slate-600 dark:text-slate-300 relative z-10">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.content}</ReactMarkdown>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </motion.div>
              )}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default Journal;
