
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, Subtask, AppConfig, JournalEntry } from '../types';
import { 
  Search, Plus, MoreVertical, Calendar, CheckCircle2, Circle, 
  Clock, AlertCircle, Zap, Bot, ArrowUp, ArrowDown, X, Layout, 
  ChevronRight, Edit3, Trash2, RotateCcw, RotateCw, Save, Rocket,
  FileText, ListTodo, History, Heading1, Heading2, Bold, Italic, Eraser,
  Pin, Check, Sparkles
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { SPHERES, applyTypography } from '../constants';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

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
}

const DOT_GRID_STYLE: React.CSSProperties = {
    backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
    backgroundSize: '24px 24px'
};

const NEON_COLORS: Record<string, string> = {
    productivity: '#818cf8',
    growth: '#34d399',
    relationships: '#fb7185'
};

const cleanHeader = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return children.replace(/:\s*$/, '');
    return children;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-xs font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-2 text-sm text-slate-600 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => inline 
        ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
        : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
};

// --- SUB-COMPONENTS ---

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, children, icon, actions }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-3">
      <div className="w-full flex items-center justify-between p-3">
        <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-1 text-left"
        >
           {icon}
           {title}
        </button>
        <div className="flex items-center gap-2">
            {actions}
        </div>
      </div>
      {isOpen && (
        <div className="px-3 pb-3 pt-0 text-sm">
             {children}
        </div>
      )}
    </div>
  );
};

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {SPHERES.map(s => {
                const isSelected = selected.includes(s.id);
                return (
                    <button
                        key={s.id}
                        onClick={() => toggleSphere(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${
                            isSelected 
                            ? `${s.bg} ${s.text} ${s.border}` 
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {s.label}
                    </button>
                );
            })}
        </div>
    );
};

const StaticChallengeRenderer: React.FC<{ content: string, mode: 'draft' | 'history' }> = ({ content, mode }) => {
    return (
        <div className="whitespace-pre-wrap">
            <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
    );
};

const InteractiveChallenge: React.FC<{ 
    content: string, 
    onToggle: (index: number) => void,
    onPin?: (index: number) => void,
    pinnedIndices?: number[]
}> = ({ content, onToggle, onPin, pinnedIndices = [] }) => {
    const lines = content.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
                if (match) {
                    const isChecked = match[1].toLowerCase() === 'x';
                    const text = match[2];
                    const isPinned = pinnedIndices.includes(i);
                    
                    return (
                        <div key={i} className="flex items-start gap-2 group">
                            <button onClick={() => onToggle(i)} className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                            <span className={`text-sm flex-1 ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{text}</span>
                            {onPin && !isChecked && (
                                <button onClick={() => onPin(i)} className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity ${isPinned ? 'text-indigo-500 opacity-100' : 'text-slate-300'}`}>
                                    <Pin size={12} className={isPinned ? 'fill-current' : ''} />
                                </button>
                            )}
                        </div>
                    );
                }
                if (!line.trim()) return null;
                return <div key={i} className="text-sm text-slate-600 dark:text-slate-400 pl-6 py-1"><ReactMarkdown components={markdownComponents}>{line}</ReactMarkdown></div>;
            })}
        </div>
    );
};

const SegmentedProgressBar = ({ total, current, color = 'text-indigo-500' }: { total: number, current: number, color?: string }) => {
    return (
        <div className="flex gap-1 h-1 mb-3 w-full">
            {Array.from({ length: total }).map((_, i) => (
                <div 
                    key={i} 
                    className={`flex-1 rounded-full ${i < current ? color.replace('text-', 'bg-') : 'bg-slate-200 dark:bg-slate-700'}`}
                />
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSphereFilter, setActiveSphereFilter] = useState<string | null>(null);
  const [showSphereSelector, setShowSphereSelector] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'doing' | 'done'>('todo');
  
  // Modal State
  const [activeModal, setActiveModal] = useState<{type: 'details' | 'stuck' | 'challenge', taskId?: string} | null>(null);
  
  // Task Editing
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const editContentEditableRef = useRef<HTMLDivElement>(null);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gemini State
  const [draftChallenge, setDraftChallenge] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  // Layout State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
      const previous = scrollY.getPrevious() || 0;
      if (latest > 50 && latest > previous) setIsHeaderHidden(true);
      else setIsHeaderHidden(false);
  });

  useEffect(() => {
      if (initialTaskId) {
          const task = tasks.find(t => t.id === initialTaskId);
          if (task) {
              setActiveModal({ type: 'details', taskId: initialTaskId });
              onClearInitialTask?.();
          }
      }
  }, [initialTaskId, tasks]);

  // --- DERIVED DATA ---
  const filteredTasks = tasks.filter(t => {
      if (t.isArchived) return false;
      const matchesSearch = !searchQuery || t.content.toLowerCase().includes(searchQuery.toLowerCase()) || t.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSphere = !activeSphereFilter || (t.spheres && t.spheres.includes(activeSphereFilter));
      return matchesSearch && matchesSphere;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
      return sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
  });

  const columns = [
      { id: 'todo', title: 'Очередь', tasks: sortedTasks.filter(t => t.column === 'todo') },
      { id: 'doing', title: 'В работе', tasks: sortedTasks.filter(t => t.column === 'doing') },
      { id: 'done', title: 'Готово', tasks: sortedTasks.filter(t => t.column === 'done') },
  ];

  const baseActiveTasks = tasks.filter(t => !t.isArchived); // For badges

  // --- HANDLERS ---

  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done') => {
      const taskId = e.dataTransfer.getData('taskId');
      const task = tasks.find(t => t.id === taskId);
      if (task && task.column !== targetColumn) {
          if (targetColumn === 'done' && task.column !== 'done') {
              if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          updateTask({ ...task, column: targetColumn });
      }
  };

  const openTaskDetails = (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          setActiveModal({ type: 'details', taskId });
          setIsEditingTask(false);
      }
  };

  const openTherapy = async (taskId: string, type: 'stuck' | 'completed') => {
      setActiveModal({ type: 'stuck', taskId });
      setAiResponse(null);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const response = await getKanbanTherapy(task.content, type, config);
          setAiResponse(response);
      }
  };

  const openChallengeGen = async (taskId: string) => {
      setActiveModal({ type: 'challenge', taskId });
      setDraftChallenge(null);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const response = await generateTaskChallenge(task.content, config);
          setDraftChallenge(response);
      }
  };

  const handleCloseModal = () => {
      setActiveModal(null);
      setIsEditingTask(false);
      setAiResponse(null);
      setDraftChallenge(null);
  };

  const getTaskForModal = () => activeModal?.taskId ? tasks.find(t => t.id === activeModal.taskId) : null;

  // --- TASK CONTENT EDITING ---
  const saveEditHistorySnapshot = (content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  };

  const handleEditInput = () => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          if (editContentEditableRef.current) {
              saveEditHistorySnapshot(editContentEditableRef.current.innerHTML);
          }
      }, 500);
  };

  const execEditCmd = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      if (editContentEditableRef.current) saveEditHistorySnapshot(editContentEditableRef.current.innerHTML);
  };

  const execEditUndo = () => {
      if (editHistoryIndex > 0) {
          const prev = editHistoryIndex - 1;
          setEditHistoryIndex(prev);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[prev];
      }
  };

  const execEditRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const next = editHistoryIndex + 1;
          setEditHistoryIndex(next);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[next];
      }
  };

  const handleClearEditStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execEditCmd('removeFormat');
  };

  useEffect(() => {
      if (isEditingTask && editContentEditableRef.current) {
          const task = getTaskForModal();
          if (task) {
              setEditTaskTitle(task.title || '');
              // Convert markdown to HTML for editor (simplified)
              editContentEditableRef.current.innerText = task.content; 
              setEditHistory([task.content]);
              setEditHistoryIndex(0);
          }
      }
  }, [isEditingTask, activeModal]);

  const handleSaveTaskContent = () => {
      const task = getTaskForModal();
      if (task && editContentEditableRef.current) {
          const newContent = editContentEditableRef.current.innerText; // Simple text extraction
          updateTask({ ...task, title: editTaskTitle, content: applyTypography(newContent) });
          setIsEditingTask(false);
      }
  };

  // --- SUBTASKS ---
  const handleAddSubtask = () => {
      const task = getTaskForModal();
      if (task && newSubtaskText.trim()) {
          const newSub: Subtask = { id: Date.now().toString(), text: newSubtaskText, isCompleted: false };
          updateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
          setNewSubtaskText('');
      }
  };

  const handleToggleSubtask = (subId: string) => {
      const task = getTaskForModal();
      if (task && task.subtasks) {
          const updatedSubtasks = task.subtasks.map(s => s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s);
          updateTask({ ...task, subtasks: updatedSubtasks });
      }
  };

  const handleDeleteSubtask = (subId: string) => {
      const task = getTaskForModal();
      if (task && task.subtasks) {
          updateTask({ ...task, subtasks: task.subtasks.filter(s => s.id !== subId) });
      }
  };

  const handleSubtaskDragStart = (e: React.DragEvent, subId: string, taskId: string) => {
      e.dataTransfer.setData('subId', subId);
      e.dataTransfer.setData('parentTaskId', taskId);
      e.stopPropagation();
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubId: string, task: Task) => {
      e.stopPropagation();
      const draggedSubId = e.dataTransfer.getData('subId');
      if (!task.subtasks) return;
      const dIdx = task.subtasks.findIndex(s => s.id === draggedSubId);
      const tIdx = task.subtasks.findIndex(s => s.id === targetSubId);
      if (dIdx > -1 && tIdx > -1 && dIdx !== tIdx) {
          const newSubtasks = [...task.subtasks];
          const [moved] = newSubtasks.splice(dIdx, 1);
          newSubtasks.splice(tIdx, 0, moved);
          updateTask({ ...task, subtasks: newSubtasks });
      }
  };

  // --- CHALLENGE LOGIC ---
  const toggleChallengeCheckbox = (index: number, task: Task) => {
      if (!task.activeChallenge) return;
      const lines = task.activeChallenge.split('\n');
      // Simple regex toggle [ ] <-> [x]
      if (lines[index].includes('[ ]')) lines[index] = lines[index].replace('[ ]', '[x]');
      else if (lines[index].includes('[x]')) lines[index] = lines[index].replace('[x]', '[ ]');
      
      updateTask({ ...task, activeChallenge: lines.join('\n') });
  };

  const handleToggleChallengeStepPin = (index: number) => {
      const task = getTaskForModal();
      if (task) {
          const currentPins = task.pinnedChallengeIndices || [];
          const newPins = currentPins.includes(index) ? currentPins.filter(i => i !== index) : [...currentPins, index];
          updateTask({ ...task, pinnedChallengeIndices: newPins });
      }
  };

  const acceptDraftChallenge = () => {
      const task = getTaskForModal();
      if (task && draftChallenge) {
          updateTask({ ...task, activeChallenge: draftChallenge, isChallengeCompleted: false, pinnedChallengeIndices: [] });
          setDraftChallenge(null);
          handleCloseModal();
      }
  };

  const toggleChallengeComplete = () => {
      const task = getTaskForModal();
      if (task) {
          updateTask({ ...task, isChallengeCompleted: !task.isChallengeCompleted });
      }
  };

  const deleteActiveChallenge = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Удалить текущий челлендж?")) {
          const task = getTaskForModal();
          if (task) {
              const history = task.activeChallenge ? [...(task.challengeHistory || []), task.activeChallenge] : task.challengeHistory;
              updateTask({ ...task, activeChallenge: undefined, isChallengeCompleted: undefined, challengeHistory: history, pinnedChallengeIndices: undefined });
          }
      }
  };

  // --- HISTORY LOGIC ---
  const deleteChallengeFromHistory = (index: number) => {
      const task = getTaskForModal();
      if (task && task.challengeHistory) {
          const newHistory = [...task.challengeHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, challengeHistory: newHistory });
      }
  };

  const deleteConsultation = (index: number) => {
      const task = getTaskForModal();
      if (task && task.consultationHistory) {
          const newHistory = [...task.consultationHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, consultationHistory: newHistory });
      }
  };

  const saveTherapyResponse = () => {
      const task = getTaskForModal();
      if (task && aiResponse) {
          updateTask({ ...task, consultationHistory: [...(task.consultationHistory || []), aiResponse] });
          setAiResponse(null);
          handleCloseModal();
      }
  };

  const renderColumn = (col: typeof columns[0]) => (
      <>
          <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-[#f8fafc] dark:bg-[#0f172a] py-2">
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.id === 'todo' ? 'bg-slate-300' : col.id === 'doing' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  <h2 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs">{col.title}</h2>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-mono">{col.tasks.length}</span>
              </div>
              <div className="flex gap-1">
                  <button onClick={() => addTask({ id: Date.now().toString(), content: 'Новая задача', column: col.id as any, createdAt: Date.now() })} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400"><Plus size={16} /></button>
              </div>
          </div>
          
          <div 
              className="flex-1 min-h-[200px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-2 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id as any)}
          >
              <AnimatePresence>
                  {col.tasks.map(task => (
                      <motion.div
                          layout
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e as any, task.id)}
                          onClick={() => openTaskDetails(task.id)}
                          className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative overflow-hidden"
                      >
                          <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500 transition-colors" />
                          
                          {/* SPHERE BADGES */}
                          {task.spheres && task.spheres.length > 0 && (
                              <div className="flex gap-1 mb-2 pl-2">
                                  {task.spheres.map(s => (
                                      <div key={s} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NEON_COLORS[s] || '#cbd5e1' }} title={s} />
                                  ))}
                              </div>
                          )}

                          <div className="pl-3 pr-6">
                              {task.title && <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{applyTypography(task.title)}</div>}
                              <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">{applyTypography(task.content)}</div>
                          </div>

                          {/* METADATA & ACTIONS */}
                          <div className="flex items-center justify-between mt-3 pl-3 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  {task.activeChallenge && (
                                      <span className={`flex items-center gap-1 ${task.isChallengeCompleted ? 'text-emerald-500' : 'text-indigo-500'}`} title="Активный челлендж">
                                          <Zap size={12} fill={task.isChallengeCompleted ? "currentColor" : "none"} />
                                      </span>
                                  )}
                                  {task.subtasks && task.subtasks.length > 0 && (
                                      <span className="flex items-center gap-1" title="Подзадачи">
                                          <ListTodo size={12} /> {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                      </span>
                                  )}
                              </div>

                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {col.id === 'done' ? (
                                      <Tooltip content="В архив"><button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded"><CheckCircle2 size={14} /></button></Tooltip>
                                  ) : (
                                      <>
                                          <Tooltip content="Терапия"><button onClick={(e) => { e.stopPropagation(); openTherapy(task.id, 'stuck'); }} className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 rounded"><Bot size={14} /></button></Tooltip>
                                          <Tooltip content="Челлендж"><button onClick={(e) => { e.stopPropagation(); openChallengeGen(task.id); }} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 rounded"><Zap size={14} /></button></Tooltip>
                                          <Tooltip content="Рефлексия"><button onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }} className="p-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-cyan-500 rounded"><FileText size={14} /></button></Tooltip>
                                      </>
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
              {col.tasks.length === 0 && <div className="h-full flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 italic">Пусто</div>}
          </div>
      </>
  );

  return (
    <div ref={scrollContainerRef} className="flex flex-col h-full relative overflow-y-auto overflow-x-hidden bg-[#f8fafc] dark:bg-[#0f172a]" style={DOT_GRID_STYLE}>
      
      {/* 1. Title Section (Scrolls away) */}
      <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Фокус на главном</p>
            </div>
        </header>
      </div>

      {/* 2. Sticky Header (Hides on scroll down) */}
      <motion.div 
            className="sticky top-0 z-40 w-full mb-[-20px]"
            animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
            {/* Extended Blur/Gradient Backdrop */}
            <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                <div 
                    className="absolute inset-0 backdrop-blur-xl"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/95 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/95 dark:to-transparent" />
            </div>

            <div className="relative z-10 w-full px-4 md:px-8 pb-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            placeholder="Поиск задач..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-all shadow-sm placeholder:text-slate-400"
                        />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                    </div>
                    
                    <Tooltip content="Сферы" side="bottom">
                        <button 
                            onClick={() => setShowSphereSelector(!showSphereSelector)} 
                            className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showSphereSelector || activeSphereFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                        >
                            <Layout size={20} />
                        </button>
                    </Tooltip>

                    <Tooltip content={sortOrder === 'asc' ? "Старые сверху" : "Новые сверху"} side="bottom">
                        <button 
                            onClick={toggleSortOrder} 
                            className="p-3 rounded-2xl border-none transition-all shadow-sm bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        >
                            {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                        </button>
                    </Tooltip>
                </div>

                {/* Sphere Selector Expansion */}
                {(showSphereSelector || activeSphereFilter) && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-2 animate-in slide-in-from-top-2 duration-200 scrollbar-none">
                        <button 
                            onClick={() => setActiveSphereFilter(null)} 
                            className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${!activeSphereFilter ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                        >
                            Все
                        </button>
                        {SPHERES.map(s => {
                             const isActive = activeSphereFilter === s.id;
                             return (
                                 <button
                                    key={s.id}
                                    onClick={() => setActiveSphereFilter(isActive ? null : s.id)}
                                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-full transition-all flex items-center gap-1.5 border uppercase tracking-wider whitespace-nowrap
                                        ${isActive 
                                            ? `${s.bg.replace('/30','')} ${s.text} ${s.border} shadow-sm ring-1 ring-offset-1 dark:ring-offset-slate-900 ring-${s.color}-400`
                                            : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300'
                                        }
                                    `}
                                 >
                                     {isActive ? `[ ${s.label} ]` : s.label}
                                 </button>
                             );
                        })}
                    </div>
                )}
            </div>
      </motion.div>

      {/* 3. Content Area */}
      <div className="w-full px-4 md:px-8 pt-10 pb-8 flex-1 min-h-0">
         {/* Mobile Tabs */}
         <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 mb-4 bg-transparent">
            {columns.map(col => (
                <button
                    key={col.id}
                    onClick={() => setActiveMobileTab(col.id as any)}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeMobileTab === col.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400'}`}
                >
                    {col.title} <span className="opacity-60 text-[10px] font-mono">({baseActiveTasks.filter(t => t.column === col.id).length})</span>
                </button>
            ))}
         </div>

         <div className="flex flex-col md:flex-row gap-8 h-full md:items-start">
            {columns.map(col => {
               const isHiddenOnMobile = activeMobileTab !== col.id;
               return (
                   <div key={col.id} className={`flex-1 min-w-[300px] flex-col h-full ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
                       {renderColumn(col)}
                   </div>
               );
            })}
         </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div className="bg-white/90 dark:bg-[#0f172a]/90 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col relative backdrop-filter" onClick={(e) => e.stopPropagation()}>
                
                {/* MODAL HEADER */}
                <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <div className="flex flex-col gap-1 pr-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            Хаб <ChevronRight size={10} /> {activeModal.type === 'challenge' ? 'Вызов' : activeModal.type === 'stuck' ? 'Терапия' : 'Задача'}
                        </div>
                        <h3 className="text-xl font-sans font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {activeModal.type === 'stuck' && <span className="flex items-center gap-2"><Bot size={20} className="text-violet-500"/> Личный консультант</span>}
                            {activeModal.type === 'challenge' && <span className="flex items-center gap-2"><Zap size={20} className="text-indigo-500"/> Новый вызов</span>}
                            {activeModal.type === 'details' && (() => {
                                const task = getTaskForModal();
                                if (task?.title) return applyTypography(task.title);
                                if (task) return 'Детали задачи'; 
                                return '';
                            })()}
                        </h3>
                    </div>
                    <div className="flex items-center shrink-0 gap-1">
                        {activeModal.type === 'details' && !isEditingTask && (
                            (() => {
                                const task = getTaskForModal();
                                if (task && task.column !== 'done') {
                                    return (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => setIsEditingTask(true)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
                                                    <Edit3 size={18} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(window.confirm('Удалить задачу?')) { deleteTask(task.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </Tooltip>
                                            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                        </>
                                    );
                                }
                                return null;
                            })()
                        )}
                        <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 pr-1">
                    {activeModal.type === 'stuck' && (
                        <div className="space-y-4">
                            {aiResponse ? (
                                <div className="space-y-4">
                                    <div className="bg-violet-50 dark:bg-violet-900/20 p-6 rounded-2xl border border-violet-100 dark:border-violet-800/50 shadow-inner">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-widest mb-3">Совет</div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                                    <Bot size={32} className="opacity-20 animate-pulse" />
                                    <span>Думаю...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeModal.type === 'challenge' && (
                        <div className="flex flex-col h-full">
                            {draftChallenge ? (
                                <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed text-sm shadow-inner relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-30">
                                        <div className="w-16 h-16 bg-indigo-500 rounded-full blur-2xl" />
                                    </div>
                                    <StaticChallengeRenderer content={draftChallenge} mode="draft" />
                                </div>
                            ) : (
                                 <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                                    <Sparkles size={32} className="opacity-20 animate-pulse" />
                                    <span>Генерирую вызов...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeModal.type === 'details' && (() => {
                        const task = getTaskForModal();
                        if (!task) return null;
                        
                        const isDone = task.column === 'done';
                        const subtasksTotal = task.subtasks?.length || 0;
                        const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                        const firstSphere = task.spheres && task.spheres.length > 0 ? task.spheres[0] : null;
                        const sphereColorClass = firstSphere && NEON_COLORS[firstSphere] ? `text-[${NEON_COLORS[firstSphere]}]` : 'text-indigo-500';

                        return (
                            <div className="space-y-6">
                                {/* TEXT EDITING */}
                                {isEditingTask ? (
                                    <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                                        <div className="mb-4">
                                            <input 
                                                type="text" 
                                                placeholder="Название" 
                                                value={editTaskTitle} 
                                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                                className="w-full bg-slate-50 dark:bg-black/20 rounded-xl p-3 text-xl font-serif font-bold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none placeholder:text-slate-300 transition-colors" 
                                            />
                                        </div>
                                        
                                        {/* Editor Toolbar */}
                                        <div className="flex items-center justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Заголовок 1"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('formatBlock', 'H1'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Heading1 size={16} /></button></Tooltip>
                                                <Tooltip content="Заголовок 2"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('formatBlock', 'H2'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Heading2 size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Bold size={16} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Italic size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Очистить"><button onMouseDown={handleClearEditStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                            </div>
                                        </div>

                                        <div 
                                            ref={editContentEditableRef} 
                                            contentEditable 
                                            onInput={handleEditInput} 
                                            className="w-full h-64 bg-slate-50 dark:bg-black/20 rounded-xl p-4 text-base text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none overflow-y-auto font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1"
                                            style={{ whiteSpace: 'pre-wrap' }} 
                                            data-placeholder="Описание задачи..." 
                                        />

                                        {/* SPHERES IN EDIT MODE ONLY */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                            <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                        </div>

                                        <div className="flex flex-col-reverse md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-4">
                                            <button onClick={() => setIsEditingTask(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 w-full md:w-auto text-center font-medium">Отмена</button>
                                            <button onClick={handleSaveTaskContent} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Check size={18} /> Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative pr-1">
                                        {/* 1. Context (Description) */}
                                        {task.description && (
                                            <CollapsibleSection title="Контекст" icon={<FileText size={12}/>}>
                                                <div className="text-xs text-[#6B6E70] dark:text-slate-400 leading-relaxed font-sans">
                                                    <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* Main Content */}
                                        <div className="text-[#2F3437] dark:text-slate-300 text-sm font-normal leading-relaxed font-sans mb-4">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                        </div>

                                        {/* 2. Checklist */}
                                        {(task.subtasks && task.subtasks.length > 0 || !isDone) && (
                                            <CollapsibleSection
                                                title="Чек-лист"
                                                icon={<ListTodo size={14}/>}
                                            >
                                                {/* SEGMENTED PROGRESS BAR */}
                                                {subtasksTotal > 0 && (
                                                    <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} />
                                                )}

                                                <div className="space-y-1">
                                                    {task.subtasks?.map(s => (
                                                        <div 
                                                            key={s.id} 
                                                            className="group flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:translate-x-0.5 cursor-pointer relative"
                                                            draggable={!isDone}
                                                            onDragStart={!isDone ? (e) => handleSubtaskDragStart(e, s.id, task.id) : undefined}
                                                            onDragOver={handleDragOver}
                                                            onDrop={!isDone ? (e) => handleSubtaskDrop(e, s.id, task) : undefined}
                                                            onClick={() => !isDone && handleToggleSubtask(s.id)}
                                                        >
                                                            {/* Custom Checkbox */}
                                                            <div className={`
                                                                w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5
                                                                ${s.isCompleted 
                                                                    ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'
                                                                }
                                                            `}>
                                                                {s.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            
                                                            <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-[#2F3437] dark:text-slate-200"}`}>{s.text}</span>
                                                            
                                                            {!isDone && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><X size={14}/></button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {!isDone && (
                                                        <div className="flex gap-2 mt-3 pl-2">
                                                            <input 
                                                                type="text" 
                                                                className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors"
                                                                placeholder="Новый пункт..."
                                                                value={newSubtaskText}
                                                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                            />
                                                            <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* 3. Challenge */}
                                        {task.activeChallenge && (
                                            <CollapsibleSection
                                                title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"}
                                                icon={
                                                    task.isChallengeCompleted 
                                                    ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                                                    : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                }
                                                actions={!isDone ? (
                                                    <div className="flex items-center gap-3">
                                                        <Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); toggleChallengeComplete(); }}
                                                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.isChallengeCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}
                                                            >
                                                                <Check size={12} strokeWidth={3} />
                                                            </button>
                                                        </Tooltip>
                                                        
                                                        <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>

                                                        <Tooltip content="Удалить челлендж">
                                                            <button onClick={(e) => deleteActiveChallenge(e)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                ) : null}
                                            >
                                                <div className="font-serif text-sm italic text-slate-800 dark:text-slate-100 leading-relaxed pl-1 pt-1">
                                                    {task.isChallengeCompleted ? (
                                                        <StaticChallengeRenderer content={task.activeChallenge} mode="history" />
                                                    ) : (
                                                        <InteractiveChallenge 
                                                            content={task.activeChallenge} 
                                                            onToggle={(i) => !isDone && toggleChallengeCheckbox(i, task)} 
                                                            onPin={!isDone ? (i) => handleToggleChallengeStepPin(i) : undefined}
                                                            pinnedIndices={task.pinnedChallengeIndices}
                                                        />
                                                    )}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* 4. History (Collapsible) */}
                                        {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                            <CollapsibleSection title="История" icon={<History size={14}/>}>
                                                <div className="space-y-4">
                                                    {task.challengeHistory?.map((h, i) => (
                                                        <div key={`ch-${i}`} className="text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group">
                                                            <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Архивный челлендж</div>
                                                            <div className="opacity-70"><StaticChallengeRenderer content={h} mode="history" /></div>
                                                            {!isDone && (
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Tooltip content="Удалить">
                                                                        <button onClick={() => deleteChallengeFromHistory(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {task.consultationHistory?.map((h, i) => (
                                                        <div key={`cons-${i}`} className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100/50 dark:border-violet-800/30 relative group">
                                                            <div className="text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Bot size={10}/> Консультация</div>
                                                            <div className="text-[#2F3437] dark:text-slate-300 leading-relaxed opacity-80"><ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown></div>
                                                            {!isDone && (
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Tooltip content="Удалить">
                                                                        <button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CollapsibleSection>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {activeModal.type === 'stuck' && aiResponse && (
                    <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button 
                            onClick={saveTherapyResponse} 
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none text-xs font-bold uppercase tracking-wider"
                        >
                            <Save size={16} /> Сохранить в историю
                        </button>
                    </div>
                )}
                {activeModal.type === 'challenge' && draftChallenge && (
                    <div className="mt-6 flex justify-end gap-2 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button 
                            onClick={acceptDraftChallenge} 
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold uppercase tracking-wider active:scale-95"
                        >
                            <Rocket size={18} /> Принять вызов
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
