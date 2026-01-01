
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { Tooltip } from './Tooltip';
import { 
  Kanban as KanbanIcon, Plus, MoreHorizontal, Calendar, 
  CheckCircle2, Circle, X, Edit3, Trash2, Zap, 
  MessageCircle, Sparkles, BrainCircuit, ArrowRight,
  Archive, RotateCcw, Play, Check, ChevronDown, ChevronUp,
  AlertCircle, Loader2, Book
} from 'lucide-react';

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

const COLUMNS: { id: 'todo' | 'doing' | 'done'; title: string; color: string }[] = [
  { id: 'todo', title: 'Очередь', color: 'bg-slate-100 dark:bg-slate-800/50' },
  { id: 'doing', title: 'В работе', color: 'bg-indigo-50 dark:bg-indigo-900/10' },
  { id: 'done', title: 'Готово', color: 'bg-emerald-50 dark:bg-emerald-900/10' },
];

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
};

const ChallengeRenderer: React.FC<{ 
    content: string,
    onToggleLine?: (index: number) => void,
    pinnedIndices?: number[]
}> = ({ content, onToggleLine, pinnedIndices = [] }) => {
    const lines = content.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const isChecked = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([xX])\]/);
                const cleanLine = line.replace(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s*/, '').replace(/^[-*+]\s+/, '');
                if (!cleanLine.trim()) return null;
                
                const isPinned = pinnedIndices.includes(i);
                
                return (
                    <div 
                        key={i} 
                        className={`flex items-start gap-2 p-1.5 rounded-lg text-sm transition-colors ${isPinned ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        onClick={() => onToggleLine && onToggleLine(i)}
                    >
                        <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </div>
                        <div className={`flex-1 ${isChecked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            <ReactMarkdown components={markdownComponents}>{cleanLine}</ReactMarkdown>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ 
    tasks, journalEntries, config, 
    addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, 
    initialTaskId, onClearInitialTask 
}) => {
    const [activeModal, setActiveModal] = useState<{ type: 'new' | 'details', taskId?: string, column?: 'todo' | 'doing' | 'done' } | null>(null);
    const [isEditingTask, setIsEditingTask] = useState(false);
    
    // Modal Form States
    const [taskTitle, setTaskTitle] = useState('');
    const [taskContent, setTaskContent] = useState('');
    
    // AI States
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);

    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setActiveModal({ type: 'details', taskId: initialTaskId });
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const activeTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done', targetId?: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('taskId');
        if (!draggedId) return;

        const task = tasks.find(t => t.id === draggedId);
        if (task && task.column !== targetColumn) {
            updateTask({ ...task, column: targetColumn });
        } else if (targetId && draggedId !== targetId) {
            reorderTask(draggedId, targetId);
        }
    };

    const handleOpenNewTask = (column: 'todo' | 'doing' | 'done') => {
        setTaskTitle('');
        setTaskContent('');
        setActiveModal({ type: 'new', column });
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setIsEditingTask(false);
        setTaskTitle('');
        setTaskContent('');
    };

    const handleCreateTask = () => {
        if (!taskTitle.trim() && !taskContent.trim()) return;
        
        const newTask: Task = {
            id: Date.now().toString(),
            title: taskTitle || 'Новая задача',
            content: taskContent,
            column: activeModal?.column || 'todo',
            createdAt: Date.now(),
            subtasks: []
        };
        addTask(newTask);
        handleCloseModal();
    };

    const handleSaveEdit = () => {
        const task = getTaskForModal();
        if (task) {
            updateTask({ ...task, title: taskTitle, content: taskContent });
            setIsEditingTask(false);
        }
    };

    const getTaskForModal = () => {
        if (activeModal?.taskId) {
            return tasks.find(t => t.id === activeModal.taskId);
        }
        return null;
    };

    // --- AI ACTIONS ---

    const handleGetTherapy = async () => {
        const task = getTaskForModal();
        if (!task) return;
        
        setIsProcessingAI(true);
        const type = task.column === 'done' ? 'completed' : 'stuck';
        const advice = await getKanbanTherapy(task.content, type, config);
        
        const history = task.consultationHistory || [];
        updateTask({ 
            ...task, 
            consultationHistory: [advice, ...history] 
        });
        setIsProcessingAI(false);
    };

    const handleGenerateChallenge = async () => {
        const task = getTaskForModal();
        if (!task) return;

        setIsGeneratingChallenge(true);
        const challengeText = await generateTaskChallenge(task.content, config);
        
        updateTask({
            ...task,
            activeChallenge: challengeText,
            isChallengeCompleted: false,
            pinnedChallengeIndices: []
        });
        setIsGeneratingChallenge(false);
    };

    const handleCompleteChallenge = () => {
        const task = getTaskForModal();
        if (!task || !task.activeChallenge) return;

        const history = task.challengeHistory || [];
        updateTask({
            ...task,
            isChallengeCompleted: true,
            challengeHistory: [task.activeChallenge, ...history],
            // activeChallenge: undefined // Keep it visible but marked done
        });
        if (window.confetti) window.confetti();
    };

    // --- SUBTASKS ---

    const handleAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const val = e.currentTarget.value.trim();
            if (!val) return;
            const task = getTaskForModal();
            if (task) {
                const newSubtask: Subtask = {
                    id: Date.now().toString(),
                    text: val,
                    isCompleted: false
                };
                updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
                e.currentTarget.value = '';
            }
        }
    };

    const toggleSubtask = (subtaskId: string) => {
        const task = getTaskForModal();
        if (task && task.subtasks) {
            const updatedSubtasks = task.subtasks.map(st => 
                st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
            );
            updateTask({ ...task, subtasks: updatedSubtasks });
        }
    };

    const deleteSubtask = (subtaskId: string) => {
        const task = getTaskForModal();
        if (task && task.subtasks) {
            updateTask({ ...task, subtasks: task.subtasks.filter(st => st.id !== subtaskId) });
        }
    };

    // --- RENDER ---

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            <header className="px-6 py-4 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Действие — лучший учитель</p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip content="Архив">
                        <button onClick={() => {/* Handle navigate to archive via parent if needed, for now just placeholder */}} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <Archive size={20} />
                        </button>
                    </Tooltip>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pt-0">
                <div className="flex h-full gap-6 min-w-[800px]">
                    {COLUMNS.map(col => (
                        <div 
                            key={col.id} 
                            className="flex-1 flex flex-col min-w-[280px] max-w-sm h-full"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.id === 'done' ? 'bg-emerald-500' : col.id === 'doing' ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                    {col.title} <span className="opacity-50">({activeTasks.filter(t => t.column === col.id).length})</span>
                                </h3>
                                <button onClick={() => handleOpenNewTask(col.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><Plus size={16} /></button>
                            </div>
                            
                            <div className={`flex-1 rounded-2xl ${col.color} p-2 overflow-y-auto custom-scrollbar-light`}>
                                {activeTasks.filter(t => t.column === col.id).map(task => (
                                    <div 
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDrop={(e) => handleDrop(e, col.id, task.id)}
                                        onClick={() => {
                                            setActiveModal({ type: 'details', taskId: task.id });
                                            setTaskTitle(task.title || '');
                                            setTaskContent(task.content);
                                            setIsEditingTask(false);
                                        }}
                                        className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700 hover:shadow-md transition-all mb-2 cursor-pointer group active:scale-[0.98]"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-medium text-slate-800 dark:text-slate-100 text-sm line-clamp-2">{task.title || task.content}</div>
                                            {task.column === 'done' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 ml-2" />}
                                        </div>
                                        
                                        {/* Meta Indicators */}
                                        <div className="flex items-center gap-3 mt-3">
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <CheckCircle2 size={12} />
                                                    <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                                                </div>
                                            )}
                                            {task.activeChallenge && (
                                                <div className={`flex items-center gap-1 text-[10px] ${task.isChallengeCompleted ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    <Zap size={12} className={task.isChallengeCompleted ? "" : "fill-current"} />
                                                    <span>Челлендж</span>
                                                </div>
                                            )}
                                            {task.consultationHistory && task.consultationHistory.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-indigo-400">
                                                    <MessageCircle size={12} />
                                                    <span>{task.consultationHistory.length}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                {activeTasks.filter(t => t.column === col.id).length === 0 && (
                                    <div className="h-20 flex items-center justify-center text-slate-400 text-xs italic opacity-50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl m-2">
                                        Пусто
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        
                        {/* MODAL HEADER */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1e293b]">
                            <div className="flex items-center gap-2">
                                <KanbanIcon size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                    {activeModal.type === 'new' ? 'Новая задача' : 'Детали задачи'}
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

                        {/* MODAL CONTENT */}
                        <div className="p-6 overflow-y-auto custom-scrollbar-light flex-1">
                            {activeModal.type === 'new' || isEditingTask ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Название</label>
                                        <input 
                                            autoFocus
                                            value={taskTitle}
                                            onChange={(e) => setTaskTitle(e.target.value)}
                                            placeholder="Что нужно сделать?"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200 text-lg font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Описание</label>
                                        <textarea 
                                            value={taskContent}
                                            onChange={(e) => setTaskContent(e.target.value)}
                                            placeholder="Детали, контекст, ссылки..."
                                            className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 text-sm text-slate-700 dark:text-slate-300 resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        {isEditingTask && <button onClick={() => setIsEditingTask(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Отмена</button>}
                                        <button 
                                            onClick={isEditingTask ? handleSaveEdit : handleCreateTask}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
                                        >
                                            {isEditingTask ? 'Сохранить' : 'Создать'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                (() => {
                                    const task = getTaskForModal();
                                    if (!task) return null;
                                    return (
                                        <div className="space-y-8">
                                            {/* Header Info */}
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">{task.title || 'Без названия'}</h2>
                                                {task.content && <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"><ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown></div>}
                                            </div>

                                            {/* Subtasks */}
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <CheckCircle2 size={14} /> Чек-лист
                                                </h4>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 space-y-1">
                                                    {task.subtasks?.map(st => (
                                                        <div key={st.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors group">
                                                            <button onClick={() => toggleSubtask(st.id)} className={`shrink-0 ${st.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                                                                {st.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                            </button>
                                                            <span className={`flex-1 text-sm ${st.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{st.text}</span>
                                                            <button onClick={() => deleteSubtask(st.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center gap-2 p-2 opacity-50 hover:opacity-100 transition-opacity">
                                                        <Plus size={16} className="text-slate-400" />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Добавить подзадачу..." 
                                                            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
                                                            onKeyDown={handleAddSubtask}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Challenge Section */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                        <Zap size={14} /> Челлендж
                                                    </h4>
                                                    {!task.activeChallenge && !task.isChallengeCompleted && (
                                                        <button 
                                                            onClick={handleGenerateChallenge} 
                                                            disabled={isGeneratingChallenge}
                                                            className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                                        >
                                                            {isGeneratingChallenge ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10} />}
                                                            Сгенерировать
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {task.activeChallenge ? (
                                                    <div className={`rounded-xl p-4 border ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'} relative`}>
                                                        {task.isChallengeCompleted && (
                                                            <div className="absolute top-0 right-0 p-2 text-emerald-500"><CheckCircle2 size={16} /></div>
                                                        )}
                                                        <div className="text-sm leading-relaxed mb-4">
                                                            <ChallengeRenderer content={task.activeChallenge} />
                                                        </div>
                                                        {!task.isChallengeCompleted && (
                                                            <button 
                                                                onClick={handleCompleteChallenge}
                                                                className="w-full py-2 bg-white/50 hover:bg-white/80 rounded-lg text-xs font-bold uppercase tracking-wider text-amber-700 hover:text-amber-800 transition-colors border border-amber-200/50"
                                                            >
                                                                Выполнить челлендж
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    !isGeneratingChallenge && (
                                                        <div className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-dashed border-slate-200 dark:border-slate-700">
                                                            Нет активного вызова. Бросьте себе вызов, чтобы ускорить прогресс.
                                                        </div>
                                                    )
                                                )}
                                                {isGeneratingChallenge && (
                                                    <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
                                                )}
                                            </div>

                                            {/* AI Therapist */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                        <BrainCircuit size={14} /> Консилиум
                                                    </h4>
                                                    <button 
                                                        onClick={handleGetTherapy} 
                                                        disabled={isProcessingAI}
                                                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                                    >
                                                        {isProcessingAI ? <Loader2 size={10} className="animate-spin"/> : <MessageCircle size={10} />}
                                                        Получить совет
                                                    </button>
                                                </div>
                                                {task.consultationHistory && task.consultationHistory.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {task.consultationHistory.map((advice, i) => (
                                                            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm leading-relaxed text-slate-700 dark:text-slate-300 relative group">
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400">#{task.consultationHistory!.length - i}</div>
                                                                <ReactMarkdown components={markdownComponents}>{advice}</ReactMarkdown>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-slate-400 italic text-center py-2">История консультаций пуста</div>
                                                )}
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                                <button onClick={() => onReflectInJournal(task.id)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                                                    <Book size={16} /> Рефлексия
                                                </button>
                                                <button onClick={() => { archiveTask(task.id); handleCloseModal(); }} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                                                    <Archive size={16} /> В архив
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kanban;
