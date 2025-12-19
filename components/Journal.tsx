import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig } from '../types';
import { ICON_MAP, applyTypography } from '../constants';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban } from 'lucide-react';

interface Props {
  entries: JournalEntry[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

// Helper to strip trailing colons from headers (Recursive)
const cleanHeader = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return children.replace(/:\s*$/, '');
    if (Array.isArray(children)) {
        return React.Children.map(children, (child, i) => {
             return i === React.Children.count(children) - 1 ? cleanHeader(child) : child;
        });
    }
    if (React.isValidElement(children)) {
        return React.cloneElement(children, {
             // @ts-ignore
            children: cleanHeader(children.props.children)
        });
    }
    return children;
};

// Standardized Markdown Styles (Matches Kanban)
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 text-slate-800 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-800" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-800" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-sm font-bold mt-3 mb-1 text-slate-900 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-sm font-bold mt-2 mb-1 text-slate-800" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 pl-4 py-1 my-3 text-slate-600 italic bg-indigo-50/30 rounded-r-lg" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-slate-800" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 border border-slate-200" {...props}>{children}</code>
            : <code className="block bg-slate-900 text-slate-50 p-3 rounded-lg text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="text-slate-400">
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-3 border-t border-slate-200/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

// Custom Select Component for cleaner UI
const TaskSelect: React.FC<{
  tasks: Task[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ tasks, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none ${
          isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
        }`}
      >
        <span className={`text-sm truncate ${selectedId ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {selectedTask ? (
             <span className="flex items-center gap-2">
                {selectedTask.column === 'done' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-indigo-500" />}
                {selectedTask.content}
             </span>
          ) : (
            "Без привязки (Свободная мысль)"
          )}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => { onSelect(''); setIsOpen(false); }}
            className="w-full text-left px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 border-b border-slate-50 transition-colors"
          >
            Без привязки (Свободная мысль)
          </button>
          {tasks.length > 0 ? (
            tasks.map(t => (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); setIsOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors flex items-start gap-2 group"
              >
                 <div className="mt-0.5 shrink-0">
                    {t.column === 'done' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-indigo-500" />}
                 </div>
                 <span className="text-slate-700 group-hover:text-indigo-900 line-clamp-2">{t.content}</span>
              </button>
            ))
          ) : (
             <div className="px-4 py-3 text-xs text-slate-400 italic text-center">Нет активных задач</div>
          )}
        </div>
      )}
    </div>
  );
};

const Journal: React.FC<Props> = ({ entries, tasks, config, addEntry, deleteEntry, updateEntry, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filter State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // View Task Modal State
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Handle incoming context from Kanban
  useEffect(() => {
    if (initialTaskId) {
      const taskExists = tasks.some(t => t.id === initialTaskId);
      if (taskExists) {
        setLinkedTaskId(initialTaskId);
        // Clear the global state so it doesn't persist on next mount if we navigate away manually
        onClearInitialTask?.();
      }
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  // Close Date Picker on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setShowDatePicker(false);
        }
      };
      if (showDatePicker) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Filter tasks for the dropdown (only Doing and Done)
  // Also include the currently selected one even if it's archived/todo, to ensure display continuity if passed via context
  const availableTasks = tasks.filter(t => !t.isArchived && (t.column === 'doing' || t.column === 'done') || t.id === linkedTaskId);

  const handlePost = () => {
    if (!content.trim()) return;

    // APPLY TYPOGRAPHY
    const formattedContent = applyTypography(content);

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      content: formattedContent,
      linkedTaskId: linkedTaskId || undefined,
      // No AI feedback initially
    };

    addEntry(newEntry);
    setContent('');
    setLinkedTaskId('');
  };

  const startEditing = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const saveEdit = (entry: JournalEntry) => {
    if (editContent.trim()) {
        // APPLY TYPOGRAPHY
        const formattedContent = applyTypography(editContent);
        
        updateEntry({ ...entry, content: formattedContent });
        setEditingId(null);
        setEditContent('');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} size={14} />;
  };

  const getTaskPreview = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    return (
      <div 
        onClick={() => setViewingTask(task)}
        className={`mt-2 mb-3 p-3 rounded-lg border text-xs flex items-center gap-3 cursor-pointer transition-all hover:shadow-md group ${task.column === 'done' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}
      >
         <div className="shrink-0">
            {task.column === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
         </div>
         <div className="flex-1 min-w-0">
            <div className="font-bold uppercase tracking-wider mb-0.5 opacity-70 text-[10px]">
               {task.column === 'done' ? 'Сделано' : 'В процессе'}
               {task.isArchived && " (В архиве)"}
            </div>
            <p className="truncate font-medium text-slate-800">{task.content}</p>
         </div>
         <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
             <Eye size={16} className="text-current opacity-50" />
         </div>
      </div>
    );
  };

  // 1. Filter
  const filteredEntries = entries.filter(entry => {
    const query = searchQuery.toLowerCase();
    
    // Date Range Filter
    if (dateRange.from) {
        const fromDate = new Date(dateRange.from + 'T00:00:00'); // Start of day local
        if (entry.date < fromDate.getTime()) return false;
    }
    if (dateRange.to) {
        const toDate = new Date(dateRange.to + 'T23:59:59.999'); // End of day local
        if (entry.date > toDate.getTime()) return false;
    }

    if (!query) return true;

    // Check entry content
    if (entry.content.toLowerCase().includes(query)) return true;
    
    // Check AI feedback
    if (entry.aiFeedback?.toLowerCase().includes(query)) return true;

    // Check linked task content
    const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
    if (linkedTask?.content.toLowerCase().includes(query)) return true;

    return false;
  });

  // 2. Sort
  const displayedEntries = [...filteredEntries].sort((a, b) => {
    return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
  });

  const hasActiveDateFilter = !!dateRange.from || !!dateRange.to;

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-full md:overflow-hidden bg-[#f8fafc]">
      
      {/* LEFT: Input Area */}
      <div className="w-full md:w-1/3 flex flex-col p-4 md:p-8 md:border-r border-b md:border-b-0 border-slate-200 bg-white md:bg-transparent shrink-0">
        <header className="mb-4 md:mb-6">
          <h1 className="text-2xl font-light text-slate-800 tracking-tight flex items-center gap-3">
            < Book className="text-slate-400" size={28} />
            Дневник <span className="text-slate-400 text-lg">/ В пути</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Осмысление пути Героя.</p>
        </header>

        <div className="bg-white rounded-2xl md:shadow-sm md:border border-slate-200 md:p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1">
              <Link size={12} /> Контекст
            </label>
            <TaskSelect 
                tasks={availableTasks} 
                selectedId={linkedTaskId} 
                onSelect={setLinkedTaskId} 
            />
          </div>

          <textarea 
            className="w-full h-32 md:h-40 resize-none outline-none text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-400 font-mono" 
            placeholder="О чем ты думаешь? Чему научило это событие? (Markdown)" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
          />
          
          <button 
            onClick={handlePost} 
            disabled={!content.trim()} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-medium transition-all shadow-md shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
          >
            <Zap size={16} className="text-amber-400" /> 
            Записать мысль
          </button>
        </div>
      </div>

      {/* RIGHT: Timeline */}
      <div className="flex-1 flex flex-col p-4 md:p-8 md:overflow-y-auto bg-slate-50/50 md:bg-transparent min-h-0 md:min-h-0">
        <div className="flex flex-col gap-3 mb-4 md:mb-6 shrink-0 max-w-3xl mx-auto w-full">
             <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Хроника</h3>
                <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-all shadow-sm"
                >
                    {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    <span className="hidden md:inline">{sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}</span>
                    <span className="md:hidden">{sortOrder === 'desc' ? 'Новые' : 'Старые'}</span>
                </button>
            </div>
            {/* SEARCH BAR & DATE FILTER */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по записям..."
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <X size={14} />
                        </button>
                    )}
                </div>
                
                {/* Date Filter Button */}
                <div className="relative" ref={datePickerRef}>
                    <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square ${hasActiveDateFilter || showDatePicker ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        title="Фильтр по дате"
                    >
                        <Calendar size={18} />
                        {hasActiveDateFilter && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                    </button>

                    {/* Date Picker Popover */}
                    {showDatePicker && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-64 p-4 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">Период</span>
                                {hasActiveDateFilter && (
                                    <button onClick={() => setDateRange({from: '', to: ''})} className="text-[10px] text-red-400 hover:text-red-600 font-medium">
                                        Сбросить
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 ml-1">С даты</label>
                                    <input 
                                        type="date" 
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1 ml-1">По дату</label>
                                    <input 
                                        type="date" 
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-300"
                                    />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                                <button onClick={() => setShowDatePicker(false)} className="text-xs text-indigo-600 font-medium hover:underline">
                                    Готово
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {displayedEntries.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full max-h-64 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl mx-auto w-full max-w-lg">
             < Book size={48} className="mb-4 opacity-20" />
             <p className="font-medium">{searchQuery || hasActiveDateFilter ? 'Ничего не найдено' : 'Страницы пусты'}</p>
             <p className="text-xs mt-1 opacity-60">{searchQuery || hasActiveDateFilter ? 'Измените параметры поиска' : 'Начни писать свою историю.'}</p>
           </div>
        ) : (
          <div className="space-y-6 max-w-3xl pb-20 md:pb-0 mx-auto w-full">
            {displayedEntries.map(entry => {
              const mentor = config.mentors.find(m => m.id === entry.mentorId);
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 relative group hover:shadow-md transition-shadow">
                  {!isEditing && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => startEditing(entry)} className="text-slate-300 hover:text-indigo-500 p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="Редактировать">
                            <Edit3 size={16} />
                         </button>
                         <button 
                            onClick={() => {
                                if (window.confirm("Удалить запись из дневника?")) deleteEntry(entry.id);
                            }} 
                            className="text-slate-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors" 
                            title="Удалить"
                         >
                            <Trash2 size={16} />
                         </button>
                    </div>
                  )}
                  
                  {/* Date Header */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <Calendar size={12} /> {new Date(entry.date).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                  </div>

                  {/* Linked Task Context */}
                  {entry.linkedTaskId && getTaskPreview(entry.linkedTaskId)}

                  {/* User Content */}
                  {isEditing ? (
                      <div className="mb-4">
                          <textarea 
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-mono"
                              placeholder="Markdown..."
                          />
                          <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-2">
                              <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded flex items-center justify-center gap-1 w-full md:w-auto">
                                  <X size={12} /> Отмена
                              </button>
                              <button onClick={() => saveEdit(entry)} className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded flex items-center justify-center gap-1 w-full md:w-auto">
                                  <Check size={12} /> Сохранить
                              </button>
                          </div>
                      </div>
                  ) : (
                    <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-normal">
                      <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* AI Feedback */}
                  {entry.aiFeedback && (
                    <div className="bg-slate-50 rounded-xl p-4 relative mt-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className={`p-1 rounded bg-white border border-slate-100 shadow-sm ${mentor?.color || 'text-slate-500'}`}>
                           <RenderIcon name={mentor?.icon || 'User'} className="w-3 h-3" />
                         </div>
                         <span className={`text-xs font-bold ${mentor?.color || 'text-slate-500'}`}>{mentor?.name || 'Ментор'}</span>
                      </div>
                      <div className="text-sm text-slate-600 italic leading-relaxed pl-1">
                        <ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW TASK MODAL */}
      {viewingTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingTask(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Контекст мысли</h3>
                    <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
                    {/* 1. Status & Task Content (Always Visible) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${viewingTask.column === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {viewingTask.column === 'done' ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                    {viewingTask.column === 'done' ? 'Сделано' : 'В процессе'}
                                    {viewingTask.isArchived && " (В архиве)"}
                            </span>
                        </div>
                        <div className="text-base text-slate-800 font-normal leading-relaxed">
                            <ReactMarkdown components={markdownComponents}>{viewingTask.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* 2. Source (Description) - Collapsible */}
                    {viewingTask.description && (
                        <CollapsibleSection title="Источник" icon={<FileText size={14}/>}>
                            <div className="text-sm text-slate-700 leading-relaxed">
                                 <ReactMarkdown components={markdownComponents}>{viewingTask.description}</ReactMarkdown>
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* 3. Active Challenge - Collapsible */}
                    {viewingTask.activeChallenge && (
                      <CollapsibleSection 
                        title={viewingTask.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                        icon={<Zap size={14}/>}
                      >
                         <div className={`p-3 rounded-lg border ${viewingTask.isChallengeCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${viewingTask.isChallengeCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                               {viewingTask.isChallengeCompleted ? 'Статус: Выполнен' : 'Статус: Активен'}
                            </span>
                            <div className="text-sm leading-relaxed text-slate-900">
                              <ReactMarkdown components={markdownComponents}>{viewingTask.activeChallenge}</ReactMarkdown>
                            </div>
                         </div>
                      </CollapsibleSection>
                    )}

                     {/* 4. Challenge History - Collapsible */}
                     {viewingTask.challengeHistory && viewingTask.challengeHistory.length > 0 && (
                        <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                           <ul className="space-y-3">
                              {viewingTask.challengeHistory.map((challenge, index) => (
                                 <li key={index} className="text-sm text-slate-900 py-2 border-b border-slate-100 last:border-0">
                                    <ReactMarkdown components={markdownComponents}>{challenge}</ReactMarkdown>
                                 </li>
                              ))}
                           </ul>
                        </CollapsibleSection>
                     )}
                    
                    {/* 5. Consultation History - Collapsible */}
                    {viewingTask.consultationHistory && viewingTask.consultationHistory.length > 0 && (
                       <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                           <ul className="space-y-4">
                              {viewingTask.consultationHistory.map((consultation, index) => (
                                 <li key={index} className="text-sm text-slate-900 py-3 border-b border-slate-100 last:border-0">
                                    <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                                 </li>
                              ))}
                           </ul>
                       </CollapsibleSection>
                    )}
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={() => setViewingTask(null)} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Journal;