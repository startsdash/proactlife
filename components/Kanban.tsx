import React, { useState, useEffect, useRef } from 'react';
import { Task, JournalEntry, AppConfig } from '../types';
import { Plus, MoreHorizontal, Calendar, CheckCircle2, Circle, ArrowRight, Trash2, Edit3, MessageSquare, Book, Bot, Zap, X, BrainCircuit, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
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

const COLUMNS: { id: 'todo' | 'doing' | 'done', title: string }[] = [
    { id: 'todo', title: 'Очередь' },
    { id: 'doing', title: 'В работе' },
    { id: 'done', title: 'Завершено' }
];

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);
    
    // AI State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            setSelectedTaskId(initialTaskId);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done', targetTaskId?: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('taskId');
        const draggedTask = tasks.find(t => t.id === draggedId);
        
        if (draggedTask) {
            if (draggedTask.column !== targetColumn) {
                updateTask({ ...draggedTask, column: targetColumn });
            } else if (targetTaskId && targetTaskId !== draggedId) {
                reorderTask(draggedId, targetTaskId);
            }
        }
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            title: newTaskTitle,
            content: newTaskTitle,
            column: 'todo',
            createdAt: Date.now()
        };
        addTask(newTask);
        setNewTaskTitle('');
        setIsAddingTask(false);
    };

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const handleCloseModal = () => {
        setSelectedTaskId(null);
        setIsEditingTask(false);
        setAiResponse(null);
    };

    const runTherapist = async (type: 'stuck' | 'completed') => {
        if (!selectedTask) return;
        setAiLoading(true);
        const result = await getKanbanTherapy(selectedTask.content, type, config);
        setAiResponse(result);
        setAiLoading(false);
    };

    const runChallenge = async () => {
        if (!selectedTask) return;
        setAiLoading(true);
        const result = await generateTaskChallenge(selectedTask.content, config);
        // Save challenge to task directly? Or show as response?
        // Let's update task
        updateTask({ 
            ...selectedTask, 
            activeChallenge: result, 
            isChallengeCompleted: false,
            challengeHistory: selectedTask.challengeHistory ? [...selectedTask.challengeHistory] : []
        });
        setAiLoading(false);
    };

    const completeChallenge = () => {
        if (selectedTask && selectedTask.activeChallenge) {
            updateTask({
                ...selectedTask,
                isChallengeCompleted: true,
                challengeHistory: [...(selectedTask.challengeHistory || []), selectedTask.activeChallenge],
                // activeChallenge is kept as "final" or moved to history completely? 
                // Let's keep it visible but marked done.
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-8 h-full overflow-hidden">
            {COLUMNS.map(col => (
                <div 
                    key={col.id}
                    className="flex-1 flex flex-col min-w-[300px] md:min-w-0 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    <div className="p-4 flex items-center justify-between shrink-0">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">{col.title}</h3>
                        <span className="text-xs font-mono text-slate-400">{tasks.filter(t => t.column === col.id).length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar-ghost px-2 pb-4 space-y-3">
                        {col.id === 'todo' && (
                            isAddingTask ? (
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 animate-in fade-in zoom-in-95">
                                    <textarea 
                                        autoFocus
                                        placeholder="Новая задача..."
                                        className="w-full bg-transparent resize-none outline-none text-sm text-slate-800 dark:text-slate-200 mb-2"
                                        rows={2}
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(); } }}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsAddingTask(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Отмена</button>
                                        <button onClick={handleAddTask} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Добавить</button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsAddingTask(true)} 
                                    className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-sm hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Новая задача
                                </button>
                            )
                        )}

                        {tasks.filter(t => t.column === col.id).map(task => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDrop={(e) => handleDrop(e, col.id, task.id)}
                                onClick={() => setSelectedTaskId(task.id)}
                                className={`
                                    bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 
                                    hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-grab active:cursor-grabbing group
                                    ${task.activeChallenge && !task.isChallengeCompleted ? 'ring-1 ring-amber-400 dark:ring-amber-500/50' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                                        {task.content}
                                    </div>
                                    {task.activeChallenge && (
                                        <Zap size={14} className={task.isChallengeCompleted ? "text-emerald-500" : "text-amber-500 animate-pulse"} />
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1">
                                        {task.spheres?.map(s => (
                                            <div key={s} className="w-2 h-2 rounded-full bg-indigo-400" title={s} />
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                        ID-{task.id.slice(-4)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* TASK DETAIL MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                    <div 
                        className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                            <div className="flex-1">
                                {isEditingTask ? (
                                    <textarea 
                                        className="w-full text-xl font-bold bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100"
                                        value={selectedTask.content}
                                        onChange={e => updateTask({ ...selectedTask, content: e.target.value })}
                                        rows={3}
                                    />
                                ) : (
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                        {selectedTask.content}
                                    </h2>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        selectedTask.column === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        selectedTask.column === 'doing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {COLUMNS.find(c => c.id === selectedTask.column)?.title}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Создано: {new Date(selectedTask.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* ACTIVE CHALLENGE CARD */}
                            {selectedTask.activeChallenge && (
                                <div className={`p-4 rounded-xl border ${selectedTask.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                            <Zap size={14} className={selectedTask.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />
                                            {selectedTask.isChallengeCompleted ? "Челлендж выполнен" : "Активный Челлендж"}
                                        </div>
                                        {!selectedTask.isChallengeCompleted && (
                                            <button onClick={completeChallenge} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors">
                                                Завершить
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300">
                                        <ReactMarkdown>{selectedTask.activeChallenge}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* AI ACTIONS */}
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => runTherapist(selectedTask.column === 'done' ? 'completed' : 'stuck')}
                                    disabled={aiLoading}
                                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                                    {selectedTask.column === 'done' ? "Анализ победы" : "Я застрял..."}
                                </button>
                                <button 
                                    onClick={runChallenge}
                                    disabled={aiLoading}
                                    className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                    Сгенерировать Челлендж
                                </button>
                            </div>

                            {/* AI RESPONSE AREA */}
                            {aiResponse && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-indigo-500 uppercase">Совет Ментора</span>
                                        <button onClick={() => setAiResponse(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none">
                                        <ReactMarkdown>{aiResponse}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* DESCRIPTION */}
                            {selectedTask.description && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Описание</h4>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                        <ReactMarkdown>{selectedTask.description}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="flex gap-2">
                                <Tooltip content="Редактировать">
                                    <button onClick={() => setIsEditingTask(!isEditingTask)} className={`p-2 rounded-lg transition-colors ${isEditingTask ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                        <Edit3 size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="В Дневник (Рефлексия)">
                                    <button onClick={() => onReflectInJournal(selectedTask.id)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                                        <Book size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                            
                            {/* Snippet Logic Integration */}
                            <div className="flex gap-2">
                                {selectedTask && selectedTask.column !== 'done' && (
                                    <>
                                        <Tooltip content="Отправить в архив">
                                            <button 
                                                onClick={() => { if(window.confirm('Отправить в архив?')) { deleteTask(selectedTask.id); handleCloseModal(); } }} 
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kanban;