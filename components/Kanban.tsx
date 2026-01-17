import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command, Palette, Bold, Italic, Eraser, Image as ImageIcon, Upload, RefreshCw, Shuffle, ArrowRight, Map, Gem } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

// Interfaces
interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  highlightedItemId?: string | null;
}

// Constants
const NEON_COLORS: Record<string, string> = {
    productivity: '#0075FF', // Cyber Blue
    growth: '#00FFA3',       // Electric Mint
    relationships: '#FF007A', // Neon Rose
    default: '#6366f1'
};

const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '24px 24px'
};

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getTaskColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const columns = [
  { id: 'todo', title: 'Очередь' },
  { id: 'doing', title: 'В работе' },
  { id: 'done', title: 'Завершено' }
];

// Utility Components & Functions
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50">{part}</span> : part
            )}
        </span>
    );
};

const formatForDisplay = (text: string) => applyTypography(text);

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-500 dark:text-slate-400 my-2 text-sm" {...props} />,
};

const getTechGlow = (spheres?: string[], activeFilter?: string | null) => {
    if (!spheres || spheres.length === 0) return '';
    const color = NEON_COLORS[spheres[0]] || NEON_COLORS.default;
    if (activeFilter && spheres.includes(activeFilter)) {
        return `0 0 15px ${color}66`;
    }
    return `0 0 5px ${color}33`;
};

const CardSphereSelector = ({ task, updateTask }: { task: Task, updateTask: (t: Task) => void }) => {
    const toggleSphere = (s: string) => {
        const current = task.spheres || [];
        const newSpheres = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
        updateTask({ ...task, spheres: newSpheres });
    };

    return (
        <div className="flex gap-1">
            {SPHERES.map(s => {
                const isActive = task.spheres?.includes(s.id);
                const Icon = ICON_MAP[s.icon];
                return (
                    <button 
                        key={s.id} 
                        onClick={(e) => { e.stopPropagation(); toggleSphere(s.id); }}
                        className={`p-1 rounded-full transition-all ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                        title={s.label}
                    >
                        <Icon size={12} />
                    </button>
                );
            })}
        </div>
    );
};

const renderCardChecklist = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.isCompleted).length;
    const total = task.subtasks.length;
    return (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
            <CheckSquare size={12} />
            <span>{completed}/{total}</span>
            <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${(completed/total)*100}%` }} />
            </div>
        </div>
    );
};

const getTabClass = (id: string, isActive: boolean) => 
    `flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${isActive ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`;

const JourneyModal = ({ task, journalEntries, onClose }: { task: Task, journalEntries: JournalEntry[], onClose: () => void }) => {
    const linkedEntries = journalEntries.filter(j => j.linkedTaskId === task.id).sort((a,b) => b.date - a.date);
    return (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Путь Героя: {task.title}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-light space-y-6">
                    {linkedEntries.length === 0 ? (
                        <div className="text-center text-slate-400 py-10">Нет записей в дневнике, связанных с этой задачей.</div>
                    ) : (
                        linkedEntries.map(entry => (
                            <div key={entry.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-500" />
                                <div className="text-xs font-bold text-slate-400 mb-2">{new Date(entry.date).toLocaleString()}</div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Main Component
const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask, highlightedItemId }) => {
  // State from provided partial code
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details' | 'challenge'} | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'doing' | 'done'>('todo');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [generatingTherapyFor, setGeneratingTherapyFor] = useState<string | null>(null);
  const [draftChallenge, setDraftChallenge] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'manual' | 'desc' | 'asc'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<{[taskId: string]: string}>({});
  const [activeSphereFilter, setActiveSphereFilter] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSphereSelector, setShowSphereSelector] = useState(false);
  
  // Creation/Edit State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  const [creationColor, setCreationColor] = useState('white');
  const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
  const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
  const creationPickerTriggerRef = useRef<HTMLButtonElement>(null); 
  const creationColorTriggerRef = useRef<HTMLButtonElement>(null);
  const creationContentRef = useRef<HTMLDivElement>(null); // Changed to div/input ref logic if needed

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('white');
  const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null); 
  const editColorTriggerRef = useRef<HTMLButtonElement>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [journeyTask, setJourneyTask] = useState<Task | null>(null);
  const taskRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  useMotionValueEvent(scrollY, "change", (latest) => {
      const previous = scrollY.getPrevious() || 0;
      const diff = latest - previous;
      const isScrollingDown = diff > 0;
      if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
      else setIsHeaderHidden(false);
  });

  const baseActiveTasks = tasks.filter(t => !t.isArchived);

  useEffect(() => {
      if (highlightedItemId && taskRefs.current[highlightedItemId]) {
          setTimeout(() => {
              taskRefs.current[highlightedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
      }
  }, [highlightedItemId]);

  useEffect(() => {
    if (initialTaskId) {
      const taskExists = tasks.some(t => t.id === initialTaskId);
      if (taskExists) {
        setActiveModal({ taskId: initialTaskId, type: 'details' });
      }
      onClearInitialTask?.();
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleColumnDrop = (e: React.DragEvent, columnId: 'todo' | 'doing' | 'done') => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const task = tasks.find(t => t.id === taskId);
      if (task && task.column !== columnId) {
          updateTask({ ...task, column: columnId });
      }
  };

  const handleTaskDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      if (draggedId !== targetId) {
          reorderTask(draggedId, targetId);
      }
  };

  const isMatch = (task: Task) => {
      if (activeSphereFilter) {
          const hasSphere = task.spheres?.includes(activeSphereFilter);
          if (!hasSphere) return false;
      }
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const inTitle = task.title?.toLowerCase().includes(q);
          const inContent = task.content.toLowerCase().includes(q);
          if (!inTitle && !inContent) return false;
      }
      return true;
  };

  const getSortedTasks = (taskList: Task[]) => {
      return [...taskList].sort((a, b) => {
          if (sortOrder === 'manual') return 0;
          if (sortOrder === 'desc') return b.createdAt - a.createdAt;
          return a.createdAt - b.createdAt;
      });
  };

  const handleCloseModal = () => setActiveModal(null);

  const renderColumn = (col: typeof columns[0]) => {
    const tasksInCol = baseActiveTasks.filter(t => t.column === col.id);
    const sortedTasks = getSortedTasks(tasksInCol);
    
    return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-transparent">
        <div className="hidden md:flex items-center mb-4 gap-3 pl-1 select-none">
            <h3 className="font-sans font-semibold text-[0.85rem] uppercase tracking-[0.15em] text-[#2F3437] dark:text-slate-200">
                {col.title}
            </h3>
            <span className="font-mono text-xs font-normal text-[#2F3437]/60 dark:text-slate-500/60">
                [ {String(tasksInCol.length).padStart(2, '0')} ]
            </span>
        </div>
        
        {col.id === 'todo' && (
             <div className="mb-4 px-1">
                {!isCreatorOpen ? (
                    <button 
                        onClick={() => { setIsCreatorOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all uppercase tracking-wider font-mono"
                    >
                        <Plus size={14} /> NEW_TASK
                    </button>
                ) : (
                    <div className={`${getTaskColorClass(creationColor)} border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-2 relative z-20`}>
                        <input 
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Новая задача..."
                            className="w-full bg-transparent outline-none font-sans font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setIsCreatorOpen(false); setNewTaskTitle(''); }} className="px-3 py-1 text-xs text-slate-500">Отмена</button>
                            <button 
                                onClick={() => {
                                    if(newTaskTitle.trim()) {
                                        addTask({
                                            id: Date.now().toString(),
                                            title: newTaskTitle,
                                            content: '',
                                            column: 'todo',
                                            createdAt: Date.now(),
                                            color: creationColor
                                        });
                                        setNewTaskTitle('');
                                        setIsCreatorOpen(false);
                                    }
                                }} 
                                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="flex-1 space-y-4 pb-2 px-1 flex-none overflow-y-auto custom-scrollbar-none" onDrop={(e) => handleColumnDrop(e, col.id as any)} onDragOver={handleDragOver}>
            <AnimatePresence>
            {sortedTasks.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 0.5 }} 
                    exit={{ opacity: 0 }}
                    className="py-12 flex flex-col items-center justify-center text-center"
                >
                   <span className="font-mono text-slate-300 dark:text-slate-700 text-xs uppercase tracking-widest">[NO DATA]</span>
                </motion.div>
            ) : (
                sortedTasks.map((task) => {
                    const match = isMatch(task);
                    const dimStyle = !match ? "opacity-10 grayscale blur-[1px] pointer-events-none scale-95" : "";
                    const glow = getTechGlow(task.spheres, activeSphereFilter);
                    const isHighlighted = highlightedItemId === task.id;

                    return (
                    <motion.div 
                        key={task.id}
                        layout 
                        ref={el => taskRefs.current[task.id] = el}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: match ? 1 : 0.1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={match ? { 
                            y: -4, 
                            scale: 1.01,
                            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)"
                        } : {}}
                        transition={{ duration: 0.2 }}
                        style={{ boxShadow: isHighlighted ? `0 0 0 2px #6366f1, ${glow}` : glow }}
                        draggable={match}
                        onDragStart={(e) => handleDragStart(e, task.id)} 
                        onDrop={(e) => handleTaskDrop(e, task.id)} 
                        onDragOver={handleDragOver} 
                        onClick={() => match && setActiveModal({taskId: task.id, type: 'details'})} 
                        className={`${getTaskColorClass(task.color)} backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group active:scale-[1.02] active:shadow-lg overflow-hidden ${dimStyle} ${match ? 'cursor-grab' : ''} ${isHighlighted ? 'ring-2 ring-indigo-500 z-10' : ''}`}
                    >
                        {isHighlighted && (
                            <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none animate-pulse" />
                        )}
                        
                        {task.coverUrl && (
                            <div className="h-32 w-full shrink-0 relative overflow-hidden">
                                <img src={task.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="p-5 flex flex-col gap-0 h-full">
                            <div className="flex justify-between items-start gap-2 mb-2">
                                 <div className="flex-1 pt-0.5 min-w-0">
                                    {task.title ? (
                                        <h4 className="font-sans text-sm font-medium text-[#2F3437] dark:text-slate-200 leading-snug break-words group-hover:text-black dark:group-hover:text-white transition-colors tracking-tight">
                                            <HighlightedText text={applyTypography(task.title)} highlight={searchQuery} />
                                        </h4>
                                    ) : null}
                                 </div>
                                 <div className="shrink-0 z-20 -mr-2 -mt-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <CardSphereSelector task={task} updateTask={updateTask} />
                                 </div>
                            </div>

                            <div className="mb-3">
                                <div className={`text-[#2F3437] dark:text-slate-400 font-sans text-sm leading-relaxed line-clamp-3 ${!task.title ? 'text-base' : ''}`}>
                                     <ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(task.content))}</ReactMarkdown>
                                </div>
                            </div>
                            
                            {renderCardChecklist(task)}
                            
                            <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                   <Tooltip content="Детали">
                                        <button className="p-2 text-slate-400 hover:text-indigo-500 rounded-full">
                                            <Maximize2 size={16} />
                                        </button>
                                   </Tooltip>
                                </div>
                                <div className="text-[10px] font-mono text-[#6B6E70] dark:text-slate-500 flex gap-2 select-none pointer-events-none">
                                    <span>[ID: {task.id.slice(-4)}]</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )})
            )}
            </AnimatePresence>
        </div>
    </div>
    );
  };

  return (
    <div ref={scrollContainerRef} className="flex flex-col h-full relative overflow-y-auto overflow-x-hidden bg-[#f8fafc] dark:bg-[#0f172a]" style={DOT_GRID_STYLE}>
      <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Фокус на главном</p>
            </div>
        </header>
      </div>
      
      <div className="w-full px-4 md:px-8 pt-10 pb-8 flex-1 min-h-0">
         <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 mb-4 bg-transparent">
            {columns.map(col => (<button key={col.id} onClick={() => setActiveMobileTab(col.id as any)} className={getTabClass(col.id, activeMobileTab === col.id)}>{col.title} <span className="opacity-60 text-[10px] font-mono">({baseActiveTasks.filter(t => t.column === col.id).length})</span></button>))}
         </div>
         <div className="flex flex-col md:flex-row gap-8 h-full md:items-start">
            {columns.map(col => { const isHiddenOnMobile = activeMobileTab !== col.id; return (<div key={col.id} className={`flex-1 min-w-[300px] flex-col h-full ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>{renderColumn(col)}</div>); })}
         </div>
      </div>

      {activeModal && (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                <div className="bg-white p-8 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4">Детали задачи</h2>
                    <p>Функционал деталей задачи (редактирование, удаление, перенос) будет реализован полностью в следующем обновлении. Сейчас используйте drag-n-drop и быстрое создание.</p>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleCloseModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Закрыть</button>
                    </div>
                </div>
            </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
          {journeyTask && (
              <JourneyModal task={journeyTask} journalEntries={journalEntries} onClose={() => setJourneyTask(null)} />
          )}
      </AnimatePresence>
    </div>
  );
};

export default Kanban;