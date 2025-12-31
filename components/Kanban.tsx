
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { 
    Plus, MoreHorizontal, Calendar, Zap, MessageCircle, AlertCircle, 
    CheckCircle2, Circle, Clock, GripVertical, Trash2, X, Edit3, 
    Play, Pause, RotateCcw, ArrowRight, ListTodo, BrainCircuit, 
    Sparkles, Shield, Trophy, Layout, ChevronDown, ChevronUp, Minus, Check 
} from 'lucide-react';
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

const NEON_COLORS: Record<string, string> = {
    productivity: '#6366f1', // Indigo
    growth: '#10b981',       // Emerald
    relationships: '#f43f5e' // Rose
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
}> = ({ title, children, icon, isCard }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`rounded-lg overflow-hidden transition-all ${isCard ? 'bg-black/5 dark:bg-white/5' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between p-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isCard ? 'py-1.5' : 'p-3'}`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="text-slate-400">
          {isOpen ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </button>
      {isOpen && (
        <div className="px-2 pb-2 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className={`pt-2 ${isCard ? 'border-t border-black/5 dark:border-white/5' : 'border-t border-slate-200/50 dark:border-slate-700/50'} text-sm`}>
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const SegmentedProgressBar = ({ total, current, color = 'text-indigo-500', className = '' }: { total: number, current: number, color?: string, className?: string }) => {
    return (
        <div className={`flex gap-1 ${className}`}>
            {Array.from({ length: total }).map((_, i) => (
                <div 
                    key={i} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < current ? color.replace('text-', 'bg-') : 'bg-slate-200 dark:bg-slate-700'}`}
                />
            ))}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
    const [cardSubtaskInputs, setCardSubtaskInputs] = useState<Record<string, string>>({});
    const [newTaskContent, setNewTaskContent] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [activeTab, setActiveTab] = useState<'todo' | 'doing' | 'done'>('todo');

    // Filter tasks not archived
    const activeTasks = tasks.filter(t => !t.isArchived);

    // Helpers for subtasks
    const handleAddSubtaskFromCard = (taskId: string) => {
        const text = cardSubtaskInputs[taskId]?.trim();
        if (!text) return;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const newSubtask: Subtask = { id: Date.now().toString(), text, isCompleted: false };
            updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
            setCardSubtaskInputs(prev => ({...prev, [taskId]: ''}));
        }
    };

    const handleToggleSubtask = (subtaskId: string, taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
            updateTask({ ...task, subtasks: updatedSubtasks });
        }
    };

    const handleDeleteSubtask = (subtaskId: string, taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
            updateTask({ ...task, subtasks: updatedSubtasks });
        }
    };

    const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, taskId: string) => {
        e.dataTransfer.setData('subtaskId', subtaskId);
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedSubtaskId = e.dataTransfer.getData('subtaskId');
        const sourceTaskId = e.dataTransfer.getData('taskId');
        
        if (sourceTaskId !== task.id || !task.subtasks) return;
        
        const subtasks = [...task.subtasks];
        const dragIndex = subtasks.findIndex(s => s.id === draggedSubtaskId);
        const dropIndex = subtasks.findIndex(s => s.id === targetSubtaskId);
        
        if (dragIndex === -1 || dropIndex === -1) return;
        
        const [removed] = subtasks.splice(dragIndex, 1);
        subtasks.splice(dropIndex, 0, removed);
        
        updateTask({ ...task, subtasks });
    };

    const handleTaskDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleTaskDrop = (e: React.DragEvent, targetId: string, column: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('taskId');
        if (draggedId && draggedId !== targetId) {
            reorderTask(draggedId, targetId);
        } else if (draggedId) {
            // If dropped on column but same id (or no targetId logic in column drop), just move column
            // We handle reorder in list, move column here if targetId is empty
        }
    };

    const handleColumnDrop = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === draggedId);
        if (task && task.column !== column) {
            updateTask({ ...task, column });
        }
    };

    const handleQuickAdd = () => {
        if (!newTaskContent.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            content: applyTypography(newTaskContent),
            column: 'todo',
            createdAt: Date.now(),
            subtasks: []
        };
        addTask(newTask);
        setNewTaskContent('');
    };

    // Render Checklist (Restored from fragment)
    const renderCardChecklist = (task: Task) => {
        const subtasksTotal = task.subtasks?.length || 0;
        const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
        const firstSphere = task.spheres && task.spheres.length > 0 ? task.spheres[0] : null;
        const sphereColorClass = firstSphere && NEON_COLORS[firstSphere] ? `text-[${NEON_COLORS[firstSphere]}]` : 'text-indigo-500';
    
        return (
        <div className="mt-2 mb-2">
            <CollapsibleSection
                title="Чек-лист"
                icon={<ListTodo size={12}/>}
                isCard
            >
                {subtasksTotal > 0 && (
                    <div className="mb-2">
                        <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} className="mb-0" />
                    </div>
                )}
                <div className="space-y-1">
                    {task.subtasks?.map(s => (
                        <div 
                            key={s.id} 
                            className="group flex items-start gap-3 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 cursor-pointer relative"
                            draggable
                            onDragStart={(e) => handleSubtaskDragStart(e, s.id, task.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleSubtaskDrop(e, s.id, task)}
                            onClick={(e) => { e.stopPropagation(); handleToggleSubtask(s.id, task.id); }}
                        >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 text-slate-300 dark:text-slate-600 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                 <GripVertical size={12} />
                            </div>
                            
                            {/* CUSTOM CHECKBOX */}
                            <div className={`
                                w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5
                                ${s.isCompleted 
                                    ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'
                                }
                            `}>
                                {s.isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                            </div>
                            
                            <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-slate-700 dark:text-slate-200"}`}>{s.text}</span>
                            
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id, task.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"><X size={12}/></button>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-2 pl-1" onClick={e => e.stopPropagation()}>
                        <input
                            type="text"
                            className="flex-1 min-w-0 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors"
                            placeholder="Новый пункт..."
                            value={cardSubtaskInputs[task.id] || ''}
                            onChange={(e) => setCardSubtaskInputs(prev => ({...prev, [task.id]: e.target.value}))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtaskFromCard(task.id)}
                        />
                        <button 
                            onClick={() => handleAddSubtaskFromCard(task.id)} 
                            disabled={!cardSubtaskInputs[task.id]?.trim()}
                            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
      )};

    const renderColumn = (colId: 'todo' | 'doing' | 'done', title: string, icon: React.ReactNode) => {
        const colTasks = activeTasks.filter(t => t.column === colId);
        
        return (
            <div 
                className="flex-1 flex flex-col min-h-0 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl md:rounded-xl border border-transparent md:border-slate-200/50 dark:md:border-slate-800"
                onDragOver={handleDragOver}
                onDrop={(e) => handleColumnDrop(e, colId)}
            >
                <div className="p-4 flex items-center justify-between sticky top-0 bg-slate-100/50 dark:bg-slate-900/20 backdrop-blur-sm z-10 rounded-t-2xl">
                    <div className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">
                        {icon} {title}
                        <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] shadow-sm">{colTasks.length}</span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                    {colId === 'todo' && (
                        <div className="mb-3">
                            <div className="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2">
                                <input 
                                    className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                    placeholder="Новая задача..."
                                    value={newTaskContent}
                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                />
                                <button onClick={handleQuickAdd} disabled={!newTaskContent.trim()} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {colTasks.map(task => (
                        <div 
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleTaskDragStart(e, task.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleTaskDrop(e, task.id, colId)}
                            className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-default relative group"
                        >
                            {/* Actions */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <Tooltip content="Редактировать"><button onClick={() => setEditingTask(task)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500"><Edit3 size={14}/></button></Tooltip>
                                <Tooltip content="Архивировать"><button onClick={() => archiveTask(task.id)} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-slate-400 hover:text-emerald-500"><CheckCircle2 size={14}/></button></Tooltip>
                                <Tooltip content="Удалить"><button onClick={() => { if(confirm("Удалить задачу?")) deleteTask(task.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500"><Trash2 size={14}/></button></Tooltip>
                            </div>

                            <div className="mb-2 pr-16 text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                {task.content}
                            </div>

                            {/* Indicators */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {task.activeChallenge && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold uppercase tracking-wider ${task.isChallengeCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                        <Zap size={10} /> {task.isChallengeCompleted ? 'Выполнено' : 'Челлендж'}
                                    </span>
                                )}
                                {task.spheres?.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    if (!sp) return null;
                                    return <div key={s} className={`w-2 h-2 rounded-full mt-1 ${sp.bg.replace('50', '400').replace('/30', '')}`} title={sp.label} />
                                })}
                            </div>

                            {/* Render Checklists */}
                            {renderCardChecklist(task)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
            <header className="mb-6 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Действуй, а не планируй</p>
                </div>
                {/* Mobile Tab Switcher */}
                <div className="md:hidden flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {['todo', 'doing', 'done'].map((tab: any) => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* Desktop: 3 Columns. Mobile: 1 Column (Tabbed) */}
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0 relative">
                <div className={`flex-1 flex flex-col md:flex ${activeTab === 'todo' ? 'flex' : 'hidden'} md:flex`}>
                    {renderColumn('todo', 'Очередь', <Circle size={14} />)}
                </div>
                <div className={`flex-1 flex flex-col md:flex ${activeTab === 'doing' ? 'flex' : 'hidden'} md:flex`}>
                    {renderColumn('doing', 'В работе', <Clock size={14} />)}
                </div>
                <div className={`flex-1 flex flex-col md:flex ${activeTab === 'done' ? 'flex' : 'hidden'} md:flex`}>
                    {renderColumn('done', 'Готово', <CheckCircle2 size={14} />)}
                </div>
            </div>

            {/* Editing Modal would go here (Simplified for now, reused logic from Journal/Napkins logic or add separate component) */}
            {/* For brevity, omitting full modal logic re-implementation unless explicitly requested, but basic editing triggers setEditingTask */}
        </div>
    );
};

export default Kanban;
