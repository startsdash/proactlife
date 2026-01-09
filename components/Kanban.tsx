
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, AppConfig, Subtask, JournalEntry } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { Plus, Minus, MoreHorizontal, Trash2, Archive, RotateCcw, CheckCircle2, Circle, Book, Zap, BrainCircuit, X, MessageCircle, Play, Pause, Target, PenTool, Layout, GripVertical, Check, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip } from './Tooltip';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-300 text-sm leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-300 text-sm" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-300 text-sm" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, isCard = false, actions, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${isCard ? 'bg-slate-50/50 dark:bg-slate-800/30 mb-2' : 'bg-transparent mb-4'} rounded-xl ${isCard ? 'border border-slate-100 dark:border-slate-700/50' : ''} overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-0 pb-2'} cursor-pointer ${isCard ? 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30' : ''} transition-colors group/header`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-3">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <div className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                {isOpen ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            </div>
        </div>
      </div>
      {isOpen && (
        <div className={`${isCard ? 'px-2 pb-2' : 'px-0 pb-2'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className={`pt-2 ${isCard ? 'border-t border-slate-200/30 dark:border-slate-700/30' : ''} text-sm`}>
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const TaskCard = ({ task, onClick, onDragStart, onDrop }: { task: Task, onClick: () => void, onDragStart: (e: React.DragEvent) => void, onDrop: (e: React.DragEvent) => void }) => {
    return (
        <div 
            draggable 
            onDragStart={onDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={onClick}
            className="group relative bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer mb-3 active:scale-95"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                    ID_{task.id.slice(-4)}
                </span>
                <GripVertical size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            </div>
            
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 line-clamp-3 leading-relaxed">
                <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-3 mt-2">
                {task.subtasks && task.subtasks.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        <CheckCircle2 size={10} />
                        <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                    </div>
                )}
                {task.activeChallenge && !task.isChallengeCompleted && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded animate-pulse">
                        <Zap size={10} />
                        <span>CHALLENGE</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  
  // Columns
  const columns = {
      todo: tasks.filter(t => t.column === 'todo' && !t.isArchived).sort((a,b) => b.createdAt - a.createdAt),
      doing: tasks.filter(t => t.column === 'doing' && !t.isArchived).sort((a,b) => b.createdAt - a.createdAt),
      done: tasks.filter(t => t.column === 'done' && !t.isArchived).sort((a,b) => b.createdAt - a.createdAt),
  };

  useEffect(() => {
      if (initialTaskId) {
          const task = tasks.find(t => t.id === initialTaskId);
          if (task) {
              setSelectedTask(task);
              onClearInitialTask?.();
          }
      }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done', targetId?: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      if (!draggedId) return;

      const draggedTask = tasks.find(t => t.id === draggedId);
      if (!draggedTask) return;

      if (draggedTask.column !== targetColumn) {
          // Move column
          updateTask({ ...draggedTask, column: targetColumn });
      } else if (targetId && targetId !== draggedId) {
          // Reorder within same column
          reorderTask(draggedId, targetId);
      }
  };

  const handleCreateTask = () => {
      if (!newTaskContent.trim()) return;
      addTask({
          id: Date.now().toString(),
          content: newTaskContent,
          column: 'todo',
          createdAt: Date.now()
      });
      setNewTaskContent('');
  };

  const handleGenerateChallenge = async (task: Task) => {
      if (!config.challengeAuthors.length) return alert("Нет авторов челленджей");
      setIsGeneratingChallenge(true);
      const challengeText = await generateTaskChallenge(task.content, config);
      updateTask({ ...task, activeChallenge: challengeText, isChallengeCompleted: false });
      setIsGeneratingChallenge(false);
  };

  const handleConsultTherapist = async (task: Task) => {
      setIsConsulting(true);
      const advice = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config);
      updateTask({ 
          ...task, 
          consultationHistory: [...(task.consultationHistory || []), advice] 
      });
      setIsConsulting(false);
  };

  const toggleSubtask = (task: Task, subtaskId: string) => {
      const newSubtasks = task.subtasks?.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      updateTask({ ...task, subtasks: newSubtasks });
  };

  const addSubtask = (task: Task, text: string) => {
      const newSubtask: Subtask = { id: Date.now().toString(), text, isCompleted: false };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
  };

  const deleteSubtask = (task: Task, subtaskId: string) => {
      updateTask({ ...task, subtasks: task.subtasks?.filter(s => s.id !== subtaskId) });
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
        {/* Header */}
        <header className="px-6 py-6 shrink-0 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Действие - лучший антидот хаосу</p>
            </div>
            
            {/* Quick Add */}
            <div className="flex gap-2 w-full max-w-md">
                <input 
                    value={newTaskContent}
                    onChange={(e) => setNewTaskContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                    placeholder="Новая задача..."
                    className="flex-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm"
                />
                <button onClick={handleCreateTask} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus size={20} />
                </button>
            </div>
        </header>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pt-0">
            <div className="flex gap-6 h-full min-w-[900px]">
                {/* Columns */}
                {(['todo', 'doing', 'done'] as const).map(col => (
                    <div 
                        key={col} 
                        className="flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, col)}
                    >
                        <div className="p-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
                            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {col === 'todo' ? 'Очередь' : col === 'doing' ? 'В работе' : 'Готово'}
                            </span>
                            <span className="bg-white dark:bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                {columns[col].length}
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-light">
                            {columns[col].map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onClick={() => setSelectedTask(task)}
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDrop={(e) => handleDrop(e, col, task.id)}
                                />
                            ))}
                            {columns[col].length === 0 && (
                                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs font-mono uppercase tracking-widest opacity-50">
                                    Пусто
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Task Detail Modal */}
        <AnimatePresence>
            {selectedTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                            <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedTask.column === 'done' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {selectedTask.column === 'done' ? 'Completed' : selectedTask.column === 'doing' ? 'In Progress' : 'To Do'}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                                </div>
                                <textarea 
                                    className="w-full text-lg font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none resize-none h-auto overflow-hidden"
                                    value={selectedTask.content}
                                    onChange={(e) => updateTask({ ...selectedTask, content: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar-light">
                            
                            {/* SUBTASKS */}
                            <CollapsibleSection title="Подзадачи" icon={<Layout size={14} />} defaultOpen={true}>
                                <div className="space-y-2">
                                    {(selectedTask.subtasks || []).map(sub => (
                                        <div key={sub.id} className="flex items-center gap-3 group">
                                            <button 
                                                onClick={() => toggleSubtask(selectedTask, sub.id)}
                                                className={`shrink-0 ${sub.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}
                                            >
                                                {sub.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {sub.text}
                                            </span>
                                            <button onClick={() => deleteSubtask(selectedTask, sub.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 mt-2">
                                        <Plus size={18} className="text-slate-300" />
                                        <input 
                                            placeholder="Добавить шаг..."
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addSubtask(selectedTask, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* CHALLENGE SYSTEM */}
                            <CollapsibleSection 
                                title="Челлендж" 
                                icon={<Zap size={14} className={selectedTask.activeChallenge && !selectedTask.isChallengeCompleted ? "text-amber-500" : ""} />}
                                actions={
                                    <Tooltip content="Сгенерировать (ИИ)">
                                        <button onClick={() => handleGenerateChallenge(selectedTask)} disabled={isGeneratingChallenge} className={`p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded text-indigo-500 ${isGeneratingChallenge ? 'animate-spin' : ''}`}>
                                            <RefreshCw size={14} />
                                        </button>
                                    </Tooltip>
                                }
                                defaultOpen={!!selectedTask.activeChallenge}
                            >
                                {selectedTask.activeChallenge ? (
                                    <div className={`p-4 rounded-xl border ${selectedTask.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                                        <div className="text-sm text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                                            <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => updateTask({ ...selectedTask, isChallengeCompleted: !selectedTask.isChallengeCompleted })}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${selectedTask.isChallengeCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                            >
                                                {selectedTask.isChallengeCompleted ? <><Check size={14} /> Выполнен</> : 'Завершить'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-xs italic">
                                        Нет активного челленджа. Сгенерируйте, чтобы усложнить задачу.
                                    </div>
                                )}
                            </CollapsibleSection>

                            {/* CONSULTATION HISTORY */}
                            {(selectedTask.consultationHistory?.length ?? 0) > 0 && (
                                <CollapsibleSection title="Советы Ментора" icon={<MessageCircle size={14} />}>
                                    <div className="space-y-4">
                                        {selectedTask.consultationHistory!.map((advice, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                                    <ReactMarkdown components={markdownComponents}>{advice}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center shrink-0">
                            <div className="flex gap-2">
                                <Tooltip content="В архив">
                                    <button onClick={() => { if(confirm('В архив?')) { archiveTask(selectedTask.id); setSelectedTask(null); } }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                        <Archive size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={() => { if(confirm('Удалить?')) { deleteTask(selectedTask.id); setSelectedTask(null); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { onReflectInJournal(selectedTask.id); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    <Book size={16} /> Рефлексия
                                </button>
                                
                                <button 
                                    onClick={() => handleConsultTherapist(selectedTask)}
                                    disabled={isConsulting}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {isConsulting ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                    {isConsulting ? 'Думаю...' : 'Совет'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Kanban;
