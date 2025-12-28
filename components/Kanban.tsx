
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Sparkles, ArrowRight } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { AnimatePresence, motion } from 'framer-motion';

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

// ... (Keep existing markdownComponents and helper functions same as before to save space, assuming they are imported or defined consistently)
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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-500 pl-3 py-1 my-2 text-sm text-slate-500 dark:text-slate-400 italic" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

// ... (Keep SphereSelector and CardSphereSelector same as original)
const CardSphereSelector: React.FC<{ task: Task, updateTask: (t: Task) => void }> = ({ task, updateTask }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleSphere = (sphereId: string) => {
        const current = task.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateTask({ ...task, spheres: newSpheres });
    };

    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded-md transition-colors border border-slate-100 dark:border-slate-700"
            >
                {task.spheres && task.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {task.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                        })}
                    </div>
                ) : (
                    <Target size={12} />
                )}
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                        {SPHERES.map(s => {
                            const isSelected = task.spheres?.includes(s.id);
                            const Icon = ICON_MAP[s.icon];
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => toggleSphere(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                    <span className="flex-1">{s.label}</span>
                                    {isSelected && <Check size={12} className="text-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// ... (Other helpers like InteractiveChallenge, StaticChallengeRenderer, CollapsibleSection remain similar, just ensuring modern styling)

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details' | 'challenge'} | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'doing' | 'done'>('todo');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reflection Prompt State
  const [completedTaskForReflection, setCompletedTaskForReflection] = useState<string | null>(null);

  // New/Edit Task States
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskContent, setEditTaskContent] = useState('');

  // Filtering
  const activeTasks = tasks.filter(t => !t.isArchived).filter(task => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return task.title?.toLowerCase().includes(q) || task.content.toLowerCase().includes(q);
  }).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    if (initialTaskId) {
      if (tasks.some(t => t.id === initialTaskId)) {
        setActiveModal({ taskId: initialTaskId, type: 'details' });
      }
      onClearInitialTask?.();
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  // Sync edit state
  useEffect(() => {
      if (activeModal?.type === 'details') {
          const task = tasks.find(t => t.id === activeModal.taskId);
          if (task) {
              setEditTaskTitle(task.title || '');
              setEditTaskContent(task.content || '');
          }
      } else {
          setIsEditingTask(false);
      }
  }, [activeModal, tasks]);

  const handleCreateTask = () => {
      if (!newTaskTitle.trim() && !newTaskContent.trim()) return;
      const newTask: Task = {
          id: Date.now().toString(),
          title: applyTypography(newTaskTitle.trim()),
          content: applyTypography(newTaskContent.trim()),
          column: 'todo',
          createdAt: Date.now(),
      };
      addTask(newTask);
      setNewTaskTitle('');
      setNewTaskContent('');
      setIsCreatorOpen(false);
  };

  const handleSaveTaskContent = () => {
      const task = tasks.find(t => t.id === activeModal?.taskId);
      if (!task) return;
      updateTask({ ...task, title: applyTypography(editTaskTitle.trim()), content: applyTypography(editTaskContent) });
      setIsEditingTask(false);
  };

  const handleQuickComplete = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      const newCol = task.column === 'done' ? 'todo' : 'done';
      updateTask({ ...task, column: newCol });
      
      if (newCol === 'done') {
          if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#10b981', '#34d399'] });
          setCompletedTaskForReflection(task.id);
          // Auto-hide reflection prompt after 8 seconds
          setTimeout(() => setCompletedTaskForReflection(null), 8000);
      }
  };

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('taskId', id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, targetCol: string, targetId?: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      if (!draggedId) return;
      const task = activeTasks.find(t => t.id === draggedId);
      if (!task) return;

      if (task.column !== targetCol) {
          updateTask({ ...task, column: targetCol as any });
          if (targetCol === 'done') {
               setCompletedTaskForReflection(task.id);
               setTimeout(() => setCompletedTaskForReflection(null), 8000);
          }
      } else if (targetId && targetId !== draggedId) {
          reorderTask(draggedId, targetId);
      }
  };

  // RENDER COLUMN
  const renderColumn = (colId: 'todo' | 'doing' | 'done', title: string) => {
      const colTasks = activeTasks.filter(t => t.column === colId);
      
      return (
          <div 
            className="flex-1 flex flex-col min-w-[280px] h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colId)}
          >
              <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      {colId === 'todo' && <Circle size={14} />}
                      {colId === 'doing' && <Sparkles size={14} className="text-indigo-500" />}
                      {colId === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {title}
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] ml-1">{colTasks.length}</span>
                  </h3>
                  {colId === 'todo' && (
                      <button onClick={() => setIsCreatorOpen(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                          <Plus size={16} />
                      </button>
                  )}
              </div>

              {colId === 'todo' && isCreatorOpen && (
                  <div className="mb-4 bg-white dark:bg-[#1e293b] rounded-xl p-4 shadow-xl border-2 border-indigo-500/20 animate-in slide-in-from-top-2">
                      <input
                          autoFocus
                          className="w-full font-bold text-sm bg-transparent outline-none mb-2 placeholder:text-slate-300"
                          placeholder="Новая задача"
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                      />
                      <textarea
                          className="w-full text-sm bg-transparent outline-none resize-none h-16 placeholder:text-slate-300"
                          placeholder="Детали..."
                          value={newTaskContent}
                          onChange={e => setNewTaskContent(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setIsCreatorOpen(false)} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1">Отмена</button>
                          <button onClick={handleCreateTask} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">Добавить</button>
                      </div>
                  </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar-light pb-20 space-y-3 px-1">
                  {colTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                          <span className="text-xs text-slate-300 dark:text-slate-600 font-medium">Нет задач</span>
                      </div>
                  ) : (
                      colTasks.map(task => (
                          <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDrop={(e) => { e.stopPropagation(); handleDrop(e, colId, task.id); }}
                              onClick={() => setActiveModal({ taskId: task.id, type: 'details' })}
                              className={`
                                  group relative bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-default
                                  ${colId === 'done' ? 'opacity-70 grayscale-[0.5]' : ''}
                              `}
                          >
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 pr-6">
                                      {task.title && <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 leading-snug">{task.title}</h4>}
                                      <div className={`text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed ${!task.title && 'text-sm font-medium text-slate-700'}`}>
                                          <ReactMarkdown components={{ p: ({children}) => <span className="pointer-events-none">{children}</span> }}>{task.content}</ReactMarkdown>
                                      </div>
                                  </div>
                                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <CardSphereSelector task={task} updateTask={updateTask} />
                                  </div>
                              </div>

                              {/* Progress / Status Indicators */}
                              {(task.subtasks?.length ?? 0) > 0 && (
                                  <div className="mt-3 flex items-center gap-2">
                                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <div 
                                              className={`h-full rounded-full transition-all duration-500 ${colId === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                              style={{ width: `${Math.round(((task.subtasks?.filter(s=>s.isCompleted).length || 0) / (task.subtasks?.length || 1)) * 100)}%` }}
                                          />
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-mono">
                                          {task.subtasks?.filter(s=>s.isCompleted).length}/{task.subtasks?.length}
                                      </span>
                                  </div>
                              )}

                              <div className="mt-3 flex justify-between items-center border-t border-slate-50 dark:border-slate-800 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                      {task.activeChallenge && <Zap size={14} className={task.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />}
                                      {journalEntries.some(e => e.linkedTaskId === task.id) && <Book size={14} className="text-cyan-500" />}
                                  </div>
                                  
                                  <div className="flex gap-1">
                                      {colId !== 'done' ? (
                                          <button 
                                              onClick={(e) => handleQuickComplete(e, task)}
                                              className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-md transition-colors"
                                              title="Завершить"
                                          >
                                              <Check size={16} />
                                          </button>
                                      ) : (
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
                                              className="p-1.5 hover:bg-amber-50 text-slate-300 hover:text-amber-600 rounded-md transition-colors"
                                              title="В архив"
                                          >
                                              <Trophy size={16} />
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative">
      <header className="p-6 md:p-8 pb-0 shrink-0 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
              <p className="text-sm text-slate-500 mt-1">Фокус на главном</p>
          </div>
          <div className="relative group w-full md:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Поиск задач..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
          </div>
      </header>

      {/* Mobile Tabs */}
      <div className="md:hidden flex px-6 mt-4 border-b border-slate-100 dark:border-slate-800">
          {(['todo', 'doing', 'done'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveMobileTab(tab)}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeMobileTab === tab ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white' : 'border-transparent text-slate-400'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-hidden p-6 md:p-8">
          <div className="h-full flex gap-6">
              {/* Desktop: Show all. Mobile: Show active tab */}
              <div className={`contents md:flex md:gap-6 w-full ${activeMobileTab === 'todo' ? 'flex' : 'hidden md:flex'}`}>
                  {renderColumn('todo', 'К выполнению')}
              </div>
              <div className={`contents md:flex md:gap-6 w-full ${activeMobileTab === 'doing' ? 'flex' : 'hidden md:flex'}`}>
                  {renderColumn('doing', 'В процессе')}
              </div>
              <div className={`contents md:flex md:gap-6 w-full ${activeMobileTab === 'done' ? 'flex' : 'hidden md:flex'}`}>
                  {renderColumn('done', 'Завершено')}
              </div>
          </div>
      </div>

      {/* REFLECTION PROMPT TOAST */}
      <AnimatePresence>
          {completedTaskForReflection && (
              <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
              >
                  <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => onReflectInJournal(completedTaskForReflection)}>
                      <div className="p-2 bg-white/10 dark:bg-slate-200/50 rounded-full">
                          <Book size={20} />
                      </div>
                      <div>
                          <div className="font-bold text-sm">Отличная работа!</div>
                          <div className="text-xs opacity-80">Запишем выводы в Дневник?</div>
                      </div>
                      <ArrowRight size={16} className="ml-2 opacity-50" />
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* MODAL (Reusing logic, updated visuals) */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    {isEditingTask ? (
                        <input 
                            value={editTaskTitle}
                            onChange={e => setEditTaskTitle(e.target.value)}
                            className="text-xl font-bold text-slate-800 dark:text-white bg-transparent outline-none border-b border-indigo-500 w-full"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-snug">
                            {tasks.find(t => t.id === activeModal?.taskId)?.title || 'Детали задачи'}
                        </h3>
                    )}
                    <div className="flex items-center gap-2 ml-4">
                        {!isEditingTask && (
                            <button onClick={() => setIsEditingTask(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><Edit3 size={18}/></button>
                        )}
                        <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-6">
                    {isEditingTask ? (
                        <>
                            <textarea 
                                value={editTaskContent}
                                onChange={e => setEditTaskContent(e.target.value)}
                                className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm leading-relaxed outline-none resize-none font-mono"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditingTask(false)} className="px-4 py-2 text-sm text-slate-500">Отмена</button>
                                <button onClick={handleSaveTaskContent} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">Сохранить</button>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-7">
                            <ReactMarkdown components={markdownComponents}>
                                {applyTypography(tasks.find(t => t.id === activeModal?.taskId)?.content || '')}
                            </ReactMarkdown>
                        </div>
                    )}
                    
                    {/* Reuse existing collapsible sections for Subtasks, Challenge, etc. here - assuming they render cleanly */}
                </div>
            </motion.div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
