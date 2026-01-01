
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, JournalEntry, AppConfig, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { 
  Plus, MoreHorizontal, Calendar, Zap, AlertCircle, CheckCircle2, 
  Circle, Clock, ArrowRight, RotateCcw, Trash2, X, Edit3, 
  MessageCircle, Bot, Sparkles, BrainCircuit, GripVertical, 
  FileText, ListTodo, History, Check, Bold, Italic, Eraser, 
  Minus, Play, Pause, RotateCw, Pin
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

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
  initialTaskId: string | null;
  onClearInitialTask: () => void;
}

const NEON_COLORS: Record<string, string> = {
    productivity: '#818cf8', // Indigo
    growth: '#34d399',      // Emerald
    relationships: '#fb7185' // Rose
};

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2" {...props}>{cleanHeader(children)}</h2>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 pl-4 py-1 my-2 text-sm italic opacity-80" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
            : <code className="block bg-black/5 dark:bg-white/10 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, actions, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-1 text-left"
          >
            {icon}
            {title}
            <div className="ml-2 text-slate-300">
              {isOpen ? <Minus size={10} /> : <Plus size={10} />}
            </div>
          </button>
          {actions && <div className="flex items-center ml-2">{actions}</div>}
      </div>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const SegmentedProgressBar: React.FC<{ total: number, current: number, color?: string }> = ({ total, current, color = 'text-indigo-500' }) => {
    return (
        <div className="flex gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
                <div 
                    key={i} 
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < current ? color.replace('text-', 'bg-') : 'bg-slate-200 dark:bg-slate-700'}`} 
                />
            ))}
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
        <div className="flex gap-2">
            {SPHERES.map(s => {
                const isSelected = selected.includes(s.id);
                const Icon = ICON_MAP[s.icon];
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
                        {Icon && <Icon size={12} />}
                        {s.label}
                    </button>
                );
            })}
        </div>
    );
};

const StaticChallengeRenderer: React.FC<{ 
    content: string,
    mode: 'draft' | 'history'
}> = ({ content, mode }) => {
    const lines = content.split('\n');
    const renderedParts: React.ReactNode[] = [];
    let textBuffer = '';

    const flushBuffer = (keyPrefix: string) => {
        if (textBuffer) {
            const trimmedBuffer = textBuffer.trim();
            if (trimmedBuffer) {
                renderedParts.push(
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-900 dark:text-slate-200 mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{textBuffer}</ReactMarkdown>
                    </div>
                );
            }
            textBuffer = '';
        }
    };

    lines.forEach((line, i) => {
        const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
        if (match) {
            flushBuffer(`line-${i}`);
            const isChecked = match[1].toLowerCase() === 'x';
            const label = match[2];
            const leadingSpaces = line.search(/\S|$/);
            const indent = leadingSpaces * 4; 
            let Icon = Circle;
            let iconClass = "text-slate-300 dark:text-slate-600";
            if (isChecked) {
                Icon = CheckCircle2;
                iconClass = "text-emerald-500";
            } else if (mode === 'history') {
                Icon = X;
                iconClass = "text-red-400";
            } else {
                Icon = Circle;
                iconClass = "text-slate-300 dark:text-slate-600";
            }
            renderedParts.push(
                <div 
                    key={`cb-${i}`}
                    className="flex items-start gap-2 w-full text-left py-1 px-1 mb-0.5 cursor-default"
                    style={{ marginLeft: `${indent}px` }}
                >
                    <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                        <Icon size={16} />
                    </div>
                    <span className={`text-sm text-slate-700 dark:text-slate-300`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
                    </span>
                </div>
            );
        } else {
            textBuffer += line + '\n';
        }
    });
    flushBuffer('end');
    return <>{renderedParts}</>;
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
                    const label = match[2];
                    const isPinned = pinnedIndices.includes(i);
                    return (
                        <div key={i} className="flex items-start gap-2 group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded transition-colors" onClick={() => onToggle(i)}>
                            <div className={`mt-0.5 ${isChecked ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </div>
                            <div className={`text-sm flex-1 ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
                            </div>
                            {onPin && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onPin(i); }}
                                    className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${isPinned ? 'text-indigo-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                                >
                                    <Pin size={12} className={isPinned ? "fill-current" : ""} />
                                </button>
                            )}
                        </div>
                    );
                }
                return (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-400 pl-1 py-0.5">
                        <ReactMarkdown components={markdownComponents}>{line}</ReactMarkdown>
                    </div>
                );
            })}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<{ type: 'details' | 'create', taskId?: string } | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  
  // Edit Mode State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Editor State
  const editContentEditableRef = useRef<HTMLDivElement>(null);
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI State
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
      if (initialTaskId) {
          const t = tasks.find(x => x.id === initialTaskId);
          if (t) {
              setActiveModal({ type: 'details', taskId: t.id });
              onClearInitialTask();
          }
      }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const handleCreateTask = () => {
      if (!newTaskContent.trim()) return;
      const newTask: Task = {
          id: Date.now().toString(),
          content: newTaskContent,
          column: 'todo',
          createdAt: Date.now(),
          spheres: []
      };
      addTask(newTask);
      setNewTaskContent('');
      setActiveModal(null);
  };

  const getTaskForModal = () => tasks.find(t => t.id === activeModal?.taskId);

  // --- EDITOR HANDLERS ---
  const saveEditHistorySnapshot = useCallback((content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  }, [editHistory, editHistoryIndex]);

  const handleEditInput = () => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          saveEditHistorySnapshot(editContentEditableRef.current?.innerHTML || '');
      }, 500); 
  };

  const execEditUndo = () => {
      if (editHistoryIndex > 0) {
          const prevIndex = editHistoryIndex - 1;
          setEditHistoryIndex(prevIndex);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[prevIndex];
      }
  };

  const execEditRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const nextIndex = editHistoryIndex + 1;
          setEditHistoryIndex(nextIndex);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[nextIndex];
      }
  };

  const execEditCmd = (command: string, value?: string) => {
      document.execCommand(command, false, value);
      if (editContentEditableRef.current) {
          editContentEditableRef.current.focus();
          saveEditHistorySnapshot(editContentEditableRef.current.innerHTML);
      }
  };

  const handleClearEditStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execEditCmd('removeFormat');
  };

  // --- SUBTASK HANDLERS ---
  const handleAddSubtask = () => {
      const task = getTaskForModal();
      if (!task || !newSubtaskText.trim()) return;
      const newSub: Subtask = { id: Date.now().toString(), text: newSubtaskText, isCompleted: false };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
      setNewSubtaskText('');
  };

  const handleToggleSubtask = (subId: string) => {
      const task = getTaskForModal();
      if (!task) return;
      const updatedSubtasks = task.subtasks?.map(s => s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s);
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subId: string) => {
      const task = getTaskForModal();
      if (!task) return;
      updateTask({ ...task, subtasks: task.subtasks?.filter(s => s.id !== subId) });
  };

  // DND for Subtasks
  const handleSubtaskDragStart = (e: React.DragEvent, subId: string, taskId: string) => {
      e.dataTransfer.setData('subtaskId', subId);
      e.dataTransfer.setData('taskId', taskId);
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubId: string, task: Task) => {
      e.preventDefault();
      const draggedSubId = e.dataTransfer.getData('subtaskId');
      const originTaskId = e.dataTransfer.getData('taskId');
      
      if (originTaskId !== task.id || draggedSubId === targetSubId || !task.subtasks) return;

      const subtasks = [...task.subtasks];
      const dIdx = subtasks.findIndex(s => s.id === draggedSubId);
      const tIdx = subtasks.findIndex(s => s.id === targetSubId);
      
      if (dIdx < 0 || tIdx < 0) return;
      
      const [moved] = subtasks.splice(dIdx, 1);
      subtasks.splice(tIdx, 0, moved);
      updateTask({ ...task, subtasks });
  };

  // --- CHALLENGE HANDLERS ---
  const generateChallenge = async () => {
      const task = getTaskForModal();
      if (!task) return;
      if (task.activeChallenge && !confirm("Заменить активный челлендж?")) return;
      
      setIsAiProcessing(true);
      try {
          const challenge = await generateTaskChallenge(task.content, config);
          if (challenge) {
              const history = task.activeChallenge ? [...(task.challengeHistory || []), task.activeChallenge] : task.challengeHistory;
              updateTask({ ...task, activeChallenge: challenge, isChallengeCompleted: false, challengeHistory: history });
          }
      } finally {
          setIsAiProcessing(false);
      }
  };

  const toggleChallengeComplete = () => {
      const task = getTaskForModal();
      if (task) updateTask({ ...task, isChallengeCompleted: !task.isChallengeCompleted });
  };

  const deleteActiveChallenge = (e: React.MouseEvent) => {
      e.stopPropagation();
      const task = getTaskForModal();
      if (task && confirm("Удалить активный челлендж?")) {
          updateTask({ ...task, activeChallenge: undefined, isChallengeCompleted: false });
      }
  };

  const deleteChallengeFromHistory = (index: number) => {
      const task = getTaskForModal();
      if (!task || !task.challengeHistory) return;
      const newHistory = [...task.challengeHistory];
      newHistory.splice(index, 1);
      updateTask({ ...task, challengeHistory: newHistory });
  };

  const toggleChallengeCheckbox = (lineIndex: number, task: Task) => {
      if (!task.activeChallenge) return;
      const lines = task.activeChallenge.split('\n');
      const line = lines[lineIndex];
      const match = line.match(/^(\s*(?:[-*+]|\d+\.)?\s*)\[([ xX])\](.*)/);
      if (match) {
          const isChecked = match[2].toLowerCase() === 'x';
          const newStatus = isChecked ? ' ' : 'x';
          lines[lineIndex] = `${match[1]}[${newStatus}]${match[3]}`;
          updateTask({ ...task, activeChallenge: lines.join('\n') });
      }
  };

  const handleToggleChallengeStepPin = (index: number) => {
      const task = getTaskForModal();
      if (!task) return;
      const current = task.pinnedChallengeIndices || [];
      const newPinned = current.includes(index) ? current.filter(i => i !== index) : [...current, index];
      updateTask({ ...task, pinnedChallengeIndices: newPinned });
  };

  // --- AI CONSULTATION ---
  const getConsultation = async (type: 'stuck' | 'completed') => {
      const task = getTaskForModal();
      if (!task) return;
      setIsAiProcessing(true);
      try {
          const advice = await getKanbanTherapy(task.content, type, config);
          if (advice) {
              updateTask({ ...task, consultationHistory: [advice, ...(task.consultationHistory || [])] });
          }
      } finally {
          setIsAiProcessing(false);
      }
  };

  const deleteConsultation = (index: number) => {
      const task = getTaskForModal();
      if (!task || !task.consultationHistory) return;
      const newHistory = [...task.consultationHistory];
      newHistory.splice(index, 1);
      updateTask({ ...task, consultationHistory: newHistory });
  };

  // --- SAVE CONTENT EDIT ---
  const handleSaveTaskContent = () => {
      const task = getTaskForModal();
      if (!task) return;
      
      let newContent = editContentEditableRef.current?.innerText || ''; // Plain text for simplicity or Markdown from HTML
      // Basic HTML to Markdown or just text. Napkins has a converter, reusing simple text here or assuming plain.
      // Ideally we reuse the converter from Napkins, but it's not exported. 
      // I'll stick to textContent for the "content" field unless I implement a converter.
      // Wait, Napkins has `htmlToMarkdown` but it's local. 
      // I will just save innerText for now to avoid complexity, or primitive replacement.
      newContent = editContentEditableRef.current?.innerText || task.content;

      updateTask({
          ...task,
          title: editTaskTitle || undefined,
          content: newContent
      });
      setIsEditingTask(false);
  };

  // --- DND Handlers for Tasks ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (!taskId) return;
      const task = tasks.find(t => t.id === taskId);
      if (task && task.column !== column) {
          updateTask({ ...task, column });
      }
  };

  // --- RENDER ---
  const renderColumn = (colId: 'todo' | 'doing' | 'done', title: string, icon: any) => {
      const colTasks = tasks.filter(t => t.column === colId && !t.isArchived);
      
      return (
          <div 
            className="flex flex-col h-full min-w-[280px] w-80 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colId)}
          >
              <div className="p-4 flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      {icon} {title} <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">{colTasks.length}</span>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                  {colTasks.map(t => (
                      <div 
                        key={t.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => setActiveModal({ type: 'details', taskId: t.id })}
                        className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md cursor-pointer transition-all group relative"
                      >
                          <div className="text-sm text-slate-800 dark:text-slate-200 line-clamp-3 mb-2 font-medium">{t.content}</div>
                          
                          <div className="flex items-center gap-2 mt-3">
                              {t.spheres?.map(s => {
                                  const color = NEON_COLORS[s] || '#94a3b8';
                                  return <div key={s} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} title={s} />
                              })}
                              
                              <div className="flex-1" />
                              
                              {/* STATUS ICONS */}
                              {t.activeChallenge && (
                                  <Zap size={14} className={t.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />
                              )}
                              {t.subtasks && t.subtasks.length > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <ListTodo size={12} />
                                      {t.subtasks.filter(s => s.isCompleted).length}/{t.subtasks.length}
                                  </div>
                              )}
                          </div>
                          
                          {/* QUICK ACTIONS */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); archiveTask(t.id); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500"><CheckCircle2 size={14}/></button>
                          </div>
                      </div>
                  ))}
                  {colTasks.length === 0 && (
                      <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-300 dark:text-slate-700 text-xs font-medium">
                          Пусто
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
        
        {/* HEADER */}
        <header className="p-4 md:p-8 flex justify-between items-center shrink-0">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Действуй, пока не остыло</p>
            </div>
            <Tooltip content="Новая задача">
                <button onClick={() => setActiveModal({ type: 'create' })} className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"><Plus size={24} /></button>
            </Tooltip>
        </header>

        {/* BOARD */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 pt-0">
            <div className="flex h-full gap-6 min-w-max">
                {renderColumn('todo', 'Очередь', <Circle size={14} className="text-slate-400" />)}
                {renderColumn('doing', 'В работе', <Play size={14} className="text-indigo-500" />)}
                {renderColumn('done', 'Готово', <CheckCircle2 size={14} className="text-emerald-500" />)}
            </div>
        </div>

        {/* MODAL */}
        {activeModal && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    
                    {/* MODAL HEADER */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0 bg-white dark:bg-[#1e293b]">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {activeModal.type === 'create' ? 'Новая миссия' : 'Детали задачи'}
                        </h3>
                        <div className="flex items-center gap-2">
                            {activeModal.type === 'details' && !isEditingTask && (
                                <>
                                    <Tooltip content="В Дневник"><button onClick={() => { onReflectInJournal(activeModal.taskId!); setActiveModal(null); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><FileText size={18} /></button></Tooltip>
                                    <Tooltip content="Редактировать"><button onClick={() => { 
                                        const t = getTaskForModal();
                                        if (t) {
                                            setEditTaskTitle(t.title || '');
                                            setEditHistory([t.content]);
                                            setEditHistoryIndex(0);
                                            setIsEditingTask(true);
                                        }
                                    }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Edit3 size={18} /></button></Tooltip>
                                    <Tooltip content="Архивировать"><button onClick={() => { archiveTask(activeModal.taskId!); setActiveModal(null); }} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><CheckCircle2 size={18} /></button></Tooltip>
                                    <Tooltip content="Удалить"><button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(activeModal.taskId!); setActiveModal(null); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18} /></button></Tooltip>
                                </>
                            )}
                            <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={24} /></button>
                        </div>
                    </div>

                    {/* MODAL CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-light bg-[#f8fafc] dark:bg-[#0f172a]/50">
                        {activeModal.type === 'create' && (
                            <div className="space-y-4">
                                <textarea 
                                    className="w-full h-40 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 resize-none outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                    placeholder="Что нужно сделать?"
                                    value={newTaskContent}
                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end">
                                    <button onClick={handleCreateTask} disabled={!newTaskContent.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">Создать</button>
                                </div>
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
                                                suppressContentEditableWarning={true}
                                            >
                                                {task.content}
                                            </div>

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
                                            <CollapsibleSection
                                                title="Чек-лист"
                                                icon={<ListTodo size={14}/>}
                                                defaultOpen={true}
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

                                            {/* 3. Challenge */}
                                            {task.activeChallenge && (
                                                <CollapsibleSection
                                                    title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"}
                                                    icon={
                                                        task.isChallengeCompleted 
                                                        ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                                                        : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                    }
                                                    defaultOpen={true}
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

                    {/* AI FOOTER (If available) */}
                    {activeModal.type === 'details' && !isEditingTask && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-[#1e293b] flex gap-2 overflow-x-auto scrollbar-none">
                            <button 
                                onClick={generateChallenge} 
                                disabled={isAiProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                {isAiProcessing ? <span className="animate-spin">⏳</span> : <Zap size={16} />}
                                {getTaskForModal()?.activeChallenge ? 'Новый Челлендж' : 'Сгенерировать Челлендж'}
                            </button>
                            <button 
                                onClick={() => getConsultation('stuck')} 
                                disabled={isAiProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                <Bot size={16} /> Совет (Застрял)
                            </button>
                            <button 
                                onClick={() => getConsultation('completed')} 
                                disabled={isAiProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                <Sparkles size={16} /> Совет (Успех)
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
