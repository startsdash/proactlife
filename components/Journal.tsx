
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Tooltip } from './Tooltip';
import { PenTool, Search, Calendar, ArrowUp, ArrowDown, Sparkles, History, X, Send, RotateCcw, RotateCw, Bold, Italic, Eraser, Image as ImageIcon, Layout, Palette, Loader2, Link, Target, Trash2, MoreHorizontal, Book, Bot, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPHERES, ICON_MAP } from '../constants';

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

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
  const [isCreationExpanded, setIsCreationExpanded] = useState(false);
  const [creationTitle, setCreationTitle] = useState('');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  const [creationColor, setCreationColor] = useState('white');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId || null);
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  
  const creationRef = useRef<HTMLDivElement>(null);
  const creationContentEditableRef = useRef<HTMLDivElement>(null);
  const [creationHistory, setCreationHistory] = useState<string[]>(['']);
  const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const creationFileInputRef = useRef<HTMLInputElement>(null);
  const lastCreationSelection = useRef<Range | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Clear initial task after loading
  useEffect(() => {
      if (initialTaskId) {
          setIsCreationExpanded(true);
          onClearInitialTask?.();
      }
  }, [initialTaskId, onClearInitialTask]);

  const availableTasks = tasks.filter(t => !t.isArchived && t.column !== 'done');
  const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor');

  const displayedEntries = useMemo(() => {
      let res = [...entries];
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          res = res.filter(e => e.content.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q));
      }
      if (dateFilter) {
          res = res.filter(e => {
              const d = new Date(e.date);
              const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              return dStr === dateFilter;
          });
      }
      return res.sort((a, b) => sortOrder === 'desc' ? b.date - a.date : a.date - b.date);
  }, [entries, searchQuery, dateFilter, sortOrder]);

  // --- EDITOR HELPERS ---
  const saveCreationSnapshot = (content: string) => {
      if (content === creationHistory[creationHistoryIndex]) return;
      const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 20) newHistory.shift();
      setCreationHistory(newHistory);
      setCreationHistoryIndex(newHistory.length - 1);
  };

  const handleCreationInput = () => {
      if (creationContentEditableRef.current) {
          saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
      }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
          if (activeImage && activeImage !== target) activeImage.style.outline = 'none';
          const img = target as HTMLImageElement;
          img.style.outline = '3px solid #6366f1'; 
          img.style.borderRadius = '4px';
          setActiveImage(img);
      } else {
          if (activeImage) { activeImage.style.outline = 'none'; setActiveImage(null); }
      }
      saveSelection();
  };

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
          lastCreationSelection.current = sel.getRangeAt(0).cloneRange();
      }
  };

  const execCreationCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (creationContentEditableRef.current) {
          creationContentEditableRef.current.focus();
          saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
      }
  };

  const execCreationUndo = () => {
      if (creationHistoryIndex > 0) {
          const prevIndex = creationHistoryIndex - 1;
          setCreationHistoryIndex(prevIndex);
          if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[prevIndex];
      }
  };

  const execCreationRedo = () => {
      if (creationHistoryIndex < creationHistory.length - 1) {
          const nextIndex = creationHistoryIndex + 1;
          setCreationHistoryIndex(nextIndex);
          if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[nextIndex];
      }
  };

  const handleClearCreationStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCreationCmd('removeFormat');
      execCreationCmd('formatBlock', 'div'); 
  };

  const handleCreationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Basic implementation for demo, robust one in Napkins
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const img = `<img src="${ev.target.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`;
                  execCreationCmd('insertHTML', img);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteActiveImage = (e?: React.MouseEvent) => {
      if(e) { e.preventDefault(); e.stopPropagation(); }
      if (activeImage) {
          activeImage.remove();
          setActiveImage(null);
          if (creationContentEditableRef.current) saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
      }
  };

  const handlePost = () => {
      const content = creationContentEditableRef.current?.innerText.trim();
      const hasImages = creationContentEditableRef.current?.querySelector('img');
      
      if (!content && !hasImages && !creationTitle) return;

      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          title: creationTitle,
          content: content || (hasImages ? 'Image Entry' : ''),
          linkedTaskId: linkedTaskId || undefined,
          spheres: selectedSpheres,
          color: creationColor,
          coverUrl: creationCover || undefined,
          isInsight: false
      };

      addEntry(newEntry);
      
      // Reset
      setCreationTitle('');
      setCreationCover(null);
      setCreationColor('white');
      setLinkedTaskId(null);
      setSelectedSpheres([]);
      if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
      setCreationHistory(['']);
      setCreationHistoryIndex(0);
      setIsCreationExpanded(false);
  };

  const handleAnalyzePath = async () => {
      if (displayedEntries.length === 0) return;
      setIsAnalyzing(true);
      try {
          const analysis = await analyzeJournalPath(displayedEntries, config);
          const newAnalysis: MentorAnalysis = {
              id: Date.now().toString(),
              date: Date.now(),
              content: analysis,
              mentorName: 'AI Mentor'
          };
          addMentorAnalysis(newAnalysis);
          setShowHistory(true);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const actionButtonStyle = "p-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 dark:hover:border-indigo-900 shadow-sm transition-all";

  const hasCreationContent = (creationContentEditableRef.current?.innerText.trim().length || 0) > 0 || creationContentEditableRef.current?.querySelector('img');

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        
        {/* HEADER */}
        <div className="w-full px-4 md:px-8 pt-6 pb-2 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
             <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника Пути</p>
             </div>
             <div className="flex gap-2">
                 <Tooltip content="Фильтр по дате">
                    <button className={actionButtonStyle} onClick={() => setDateFilter(dateFilter ? '' : new Date().toISOString().split('T')[0])}>
                        <Calendar size={20} className={dateFilter ? "text-indigo-500" : ""} />
                    </button>
                 </Tooltip>
                 <Tooltip content={sortOrder === 'desc' ? "Сначала новые" : "Сначала старые"}>
                    <button className={actionButtonStyle} onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                        {sortOrder === 'desc' ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                    </button>
                 </Tooltip>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar-light relative z-10">
             <div className="w-full px-4 md:px-8 pt-6 pb-8 relative z-10">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
                <div className="max-w-3xl mx-auto w-full mb-8 relative z-30">
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 min-w-0" ref={creationRef}>
                            {!isCreationExpanded ? (
                                <div 
                                    onClick={() => { setIsCreationExpanded(true); setTimeout(() => creationContentEditableRef.current?.focus(), 100); }}
                                    className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all h-[52px]"
                                >
                                    <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Записать мысль...</span>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <PenTool size={18} />
                                    </div>
                                </div>
                            ) : (
                                <div className={`${getJournalColorClass(creationColor)} backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-lg p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 relative`}>
                                    {creationCover && (
                                        <div className="relative w-full h-32 group rounded-t-xl overflow-hidden -mt-5 -mx-5 mb-3 w-[calc(100%_+_2.5rem)]">
                                            <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                            <button onClick={() => setCreationCover(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                        </div>
                                    )}
                                    
                                    <input 
                                        type="text" 
                                        placeholder="Название" 
                                        value={creationTitle}
                                        onChange={(e) => setCreationTitle(e.target.value)}
                                        className="w-full bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-2"
                                    />

                                    {/* Expanded Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                                <Link size={10} strokeWidth={1} /> Контекст
                                            </label>
                                            <select 
                                                value={linkedTaskId || ''} 
                                                onChange={(e) => setLinkedTaskId(e.target.value || null)}
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-2 outline-none text-slate-700 dark:text-slate-300"
                                            >
                                                <option value="">Без привязки</option>
                                                {availableTasks.map(t => (
                                                    <option key={t.id} value={t.id}>{t.title || t.content.substring(0, 30)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                                <Target size={10} strokeWidth={1} /> Сферы
                                            </label>
                                            <div className="flex gap-2">
                                                {SPHERES.map(s => (
                                                    <button 
                                                        key={s.id}
                                                        onClick={() => setSelectedSpheres(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                                                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${selectedSpheres.includes(s.id) ? s.bg.replace('/30','') + ' ' + s.border : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                                                        title={s.label}
                                                    >
                                                        {selectedSpheres.includes(s.id) && <div className={`w-2 h-2 rounded-full ${s.bg.replace('50', '500').replace('/30','')}`} />}
                                                    </button>
                                                ))}
                                            </div>
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
                                            data-placeholder="О чем ты думаешь? Чему научило это событие?"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                                    </div>

                                    {/* TOOLBAR */}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                                            <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execCreationUndo(); }} disabled={creationHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                            <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execCreationRedo(); }} disabled={creationHistoryIndex >= creationHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                            <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearCreationStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={creationFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCreationImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                            {activeImage && creationContentEditableRef.current && creationContentEditableRef.current.contains(activeImage) && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            {/* Simplified Cover/Color Pickers for Journal */}
                                            <div className="relative">
                                                <Tooltip content="Фон записи">
                                                    <div className="flex gap-1">
                                                        {colors.slice(0, 4).map(c => (
                                                            <button key={c.id} onMouseDown={(e) => { e.preventDefault(); setCreationColor(c.id); }} className={`w-4 h-4 rounded-full border border-slate-300 ${creationColor === c.id ? 'ring-1 ring-indigo-500' : ''}`} style={{ backgroundColor: c.hex }} />
                                                        ))}
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handlePost} 
                                            disabled={!hasCreationContent && !creationTitle} 
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
                                        >
                                            <Send size={16} strokeWidth={1} /> 
                                            <span className="font-serif">Записать мысль</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsCreationExpanded(false)} 
                                            className="px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        >
                                            <X size={20} strokeWidth={1} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                            {hasMentorTool && (
                                <>
                                    <Tooltip content={isAnalyzing ? "Остановить генерацию" : "Наставник (ИИ)"} side="bottom" disabled={isAnalyzing}>
                                        <button 
                                            onClick={handleAnalyzePath} 
                                            disabled={displayedEntries.length === 0} 
                                            className={`${actionButtonStyle} ${isAnalyzing ? 'animate-pulse' : ''}`}
                                        >
                                            {isAnalyzing ? (
                                                <div className="relative w-4 h-4 flex items-center justify-center">
                                                    <Loader2 size={20} className="animate-spin absolute inset-0" />
                                                </div>
                                            ) : (
                                                <Sparkles size={20} strokeWidth={1.5} />
                                            )}
                                        </button>
                                    </Tooltip>

                                    <Tooltip content="Архив наставника" side="bottom">
                                        <button 
                                            onClick={() => setShowHistory(true)} 
                                            className={actionButtonStyle}
                                        >
                                            <History size={20} strokeWidth={1.5} />
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ENTRIES LIST */}
                <div className="max-w-3xl mx-auto space-y-6">
                    {displayedEntries.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-serif italic opacity-50">
                            {searchQuery ? 'Ничего не найдено' : 'Пустота... Начни писать.'}
                        </div>
                    ) : (
                        displayedEntries.map(entry => (
                            <div key={entry.id} className={`${getJournalColorClass(entry.color)} rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative group`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-light text-slate-300 dark:text-slate-600">{new Date(entry.date).getDate()}</div>
                                        <div className="flex flex-col">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                                            <div className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">{new Date(entry.date).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteEntry(entry.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                {entry.title && <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 font-sans">{entry.title}</h3>}
                                <div className="prose prose-sm dark:prose-invert font-serif text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <ReactMarkdown>{entry.content}</ReactMarkdown>
                                </div>
                                {entry.isInsight && (
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-full">
                                        <Sparkles size={12} /> Инсайт
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
             </div>
        </div>

        {/* MENTOR HISTORY MODAL */}
        <AnimatePresence>
            {showHistory && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowHistory(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.95 }} 
                        animate={{ scale: 1 }} 
                        exit={{ scale: 0.95 }} 
                        className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><History size={18} /> Архив Ментора</h3>
                            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {mentorAnalyses.length === 0 ? (
                                <div className="text-center text-slate-400 italic">История пуста</div>
                            ) : (
                                mentorAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
                                            <span>{new Date(analysis.date).toLocaleDateString()}</span>
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Journal;
