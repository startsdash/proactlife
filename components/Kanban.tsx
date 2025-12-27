import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Plus, X, Trash2, CheckCircle2, Circle, AlertCircle, Bot, Zap, History, MessageCircle, ArrowRight, Play, CheckSquare, Square, Pin, ChevronDown, Minus, Loader2, Archive, MessageSquare, MoreVertical, GripVertical, Check } from 'lucide-react';
import EmptyState from './EmptyState';
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
  onClearInitialTask: () => void;
}

// --- HELPERS ---
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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-xs font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-xs font-bold mt-2 mb-1 text-slate-800 dark:text-slate-200" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-2 text-sm text-slate-600 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
           <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
             <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                {selected.length > 0 ? selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ') : 'Сферы'}
                <ChevronDown size={12} />
             </button>
             {isOpen && (
                 <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1">
                        {SPHERES.map(s => {
                            const isSelected = selected.includes(s.id);
                            return (
                                <button key={s.id} onClick={() => { 
                                    const next = isSelected ? selected.filter(id => id !== s.id) : [...selected, s.id];
                                    onChange(next);
                                }} className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs rounded-lg ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
                                    {isSelected && <Check size={12} />}
                                    <span className="flex-1">{s.label}</span>
                                </button>
                            );
                        })}
                    </div>
                 </>
             )}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [isTherapyLoading, setIsTherapyLoading] = useState(false);
    const [isChallengeLoading, setIsChallengeLoading] = useState(false);
    const [activeColumn, setActiveColumn] = useState<'todo' | 'doing' | 'done'>('todo'); // For mobile tabs

    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setSelectedTask(task);
                onClearInitialTask();
            }
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const activeTasks = tasks.filter(t => !t.isArchived);

    const handleAddTask = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newTaskContent.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            content: applyTypography(newTaskContent),
            column: 'todo',
            createdAt: Date.now(),
            spheres: []
        };
        addTask(newTask);
        setNewTaskContent('');
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

    const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done') => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.column !== targetColumn) {
            updateTask({ ...task, column: targetColumn });
        }
    };

    // --- TASK DETAILS & ACTIONS ---
    const handleConsultAI = async () => {
        if (!selectedTask) return;
        setIsTherapyLoading(true);
        const response = await getKanbanTherapy(selectedTask.content, selectedTask.column === 'done' ? 'completed' : 'stuck', config);
        const updated = {
            ...selectedTask,
            consultationHistory: [...(selectedTask.consultationHistory || []), response]
        };
        updateTask(updated);
        setSelectedTask(updated);
        setIsTherapyLoading(false);
    };

    const handleGenerateChallenge = async () => {
        if (!selectedTask) return;
        setIsChallengeLoading(true);
        const challenge = await generateTaskChallenge(selectedTask.content, config);
        const updated = {
            ...selectedTask,
            activeChallenge: challenge,
            isChallengeCompleted: false
        };
        updateTask(updated);
        setSelectedTask(updated);
        setIsChallengeLoading(false);
    };

    const completeChallenge = () => {
        if (!selectedTask || !selectedTask.activeChallenge) return;
        const updated = {
            ...selectedTask,
            isChallengeCompleted: true,
            challengeHistory: [...(selectedTask.challengeHistory || []), selectedTask.activeChallenge],
            // activeChallenge is kept as history of "active" for now, or cleared? Usually keep as reference.
        };
        updateTask(updated);
        setSelectedTask(updated);
        // Maybe trigger confetti
        if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    const deleteConsultation = (index: number) => {
        if (!selectedTask) return;
        const newHistory = [...(selectedTask.consultationHistory || [])];
        newHistory.splice(index, 1);
        const updated = { ...selectedTask, consultationHistory: newHistory };
        updateTask(updated);
        setSelectedTask(updated);
    };

    // --- RENDERERS ---
    const renderColumn = (columnId: 'todo' | 'doing' | 'done', title: string, icon: React.ReactNode) => {
        const columnTasks = activeTasks.filter(t => t.column === columnId).sort((a, b) => b.createdAt - a.createdAt);

        return (
            <div 
                className={`flex-1 flex flex-col min-w-[280px] bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/50 dark:border-slate-800 h-full ${activeColumn === columnId || window.innerWidth >= 768 ? 'flex' : 'hidden md:flex'}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, columnId)}
            >
                <div className="p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                    {columnId === 'todo' && (
                        <form onSubmit={handleAddTask} className="mb-4">
                            <input 
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none"
                                placeholder="+ Новая задача"
                                value={newTaskContent}
                                onChange={(e) => setNewTaskContent(e.target.value)}
                            />
                        </form>
                    )}
                    
                    {columnTasks.map(task => (
                        <div 
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => setSelectedTask(task)}
                            className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-wrap gap-1">
                                    {task.spheres?.map(s => (
                                        <div key={s} className="w-2 h-2 rounded-full bg-indigo-400" title={SPHERES.find(sp => sp.id === s)?.label} />
                                    ))}
                                </div>
                                <div className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical size={14} />
                                </div>
                            </div>
                            <div className={`text-sm text-slate-800 dark:text-slate-200 mb-3 line-clamp-3 leading-relaxed ${task.column === 'done' ? 'line-through opacity-60' : ''}`}>
                                {task.content}
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    {task.activeChallenge && (
                                        <Tooltip content={task.isChallengeCompleted ? "Челлендж выполнен" : "Активный челлендж"}>
                                            <Zap size={14} className={task.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />
                                        </Tooltip>
                                    )}
                                    {task.consultationHistory && task.consultationHistory.length > 0 && (
                                        <Tooltip content="Есть консультации">
                                            <MessageCircle size={14} className="text-indigo-400" />
                                        </Tooltip>
                                    )}
                                </div>
                                {columnId === 'done' && (
                                    <Tooltip content="В Архив">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
                                            className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
                                        >
                                            <Archive size={14} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {columnTasks.length === 0 && columnId !== 'todo' && (
                        <div className="py-8 opacity-50">
                             <EmptyState icon={columnId === 'doing' ? Play : CheckSquare} title="" description="Нет задач" color="slate" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-hidden p-4 md:p-8">
            <header className="mb-6 flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">От слов к делу</p>
                </div>
                
                {/* Mobile Tabs */}
                <div className="md:hidden flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                     <button onClick={() => setActiveColumn('todo')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${activeColumn === 'todo' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Надо</button>
                     <button onClick={() => setActiveColumn('doing')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${activeColumn === 'doing' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>В процессе</button>
                     <button onClick={() => setActiveColumn('done')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${activeColumn === 'done' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Готово</button>
                </div>
            </header>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 min-w-0">
                {renderColumn('todo', 'Надо сделать', <Circle size={16} className="text-slate-400" />)}
                {renderColumn('doing', 'В процессе', <Play size={16} className="text-indigo-500" />)}
                {renderColumn('done', 'Готово', <CheckCircle2 size={16} className="text-emerald-500" />)}
            </div>

            {/* TASK DETAILS MODAL */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                             <textarea 
                                value={selectedTask.content}
                                onChange={(e) => {
                                    const updated = { ...selectedTask, content: e.target.value };
                                    updateTask(updated);
                                    setSelectedTask(updated);
                                }}
                                className="bg-transparent text-lg md:text-xl font-medium text-slate-800 dark:text-slate-200 w-full resize-none outline-none h-auto min-h-[3rem]"
                                rows={2}
                             />
                             <div className="flex items-center gap-1 ml-4">
                                 <button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(selectedTask.id); setSelectedTask(null); } }} className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={20} /></button>
                                 <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
                             </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar-light space-y-6">
                            
                            {/* Controls Bar */}
                            <div className="flex flex-wrap gap-2">
                                <SphereSelector 
                                    selected={selectedTask.spheres || []} 
                                    onChange={(s) => {
                                        const updated = { ...selectedTask, spheres: s };
                                        updateTask(updated);
                                        setSelectedTask(updated);
                                    }} 
                                />
                                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                                <button 
                                    onClick={handleConsultAI} 
                                    disabled={isTherapyLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-bold uppercase disabled:opacity-50"
                                >
                                    {isTherapyLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                                    Консультант
                                </button>
                                <button 
                                    onClick={handleGenerateChallenge}
                                    disabled={isChallengeLoading} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs font-bold uppercase disabled:opacity-50"
                                >
                                    {isChallengeLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                    Челлендж
                                </button>
                                <button 
                                    onClick={() => onReflectInJournal(selectedTask.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-xs font-bold uppercase"
                                >
                                    <MessageSquare size={12} />
                                    В Дневник
                                </button>
                            </div>

                            {/* Challenge Section */}
                            {selectedTask.activeChallenge && (
                                <div className={`p-4 rounded-xl border-2 ${selectedTask.isChallengeCompleted ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'} relative overflow-hidden`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className={selectedTask.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />
                                            <h4 className={`text-xs font-bold uppercase tracking-wider ${selectedTask.isChallengeCompleted ? "text-emerald-600" : "text-amber-600"}`}>
                                                {selectedTask.isChallengeCompleted ? 'Челлендж Выполнен' : 'Активный Вызов'}
                                            </h4>
                                        </div>
                                        {!selectedTask.isChallengeCompleted && (
                                            <button onClick={completeChallenge} className="bg-emerald-500 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-emerald-600 shadow-sm transition-colors">
                                                Завершить
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                        <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* Consultation History */}
                            {(selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0) && (
                                <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                                    <div className="space-y-4">
                                        {selectedTask.consultationHistory?.map((h, i) => (
                                            <div key={`cons-${i}`} className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 relative group">
                                                <div className="text-[10px] font-bold text-violet-400 mb-1 flex items-center gap-1"><Bot size={10}/> Консультация</div>
                                                <ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip content="Удалить">
                                                        <button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                             {/* Challenge History */}
                            {(selectedTask.challengeHistory && selectedTask.challengeHistory.length > 0) && (
                                <CollapsibleSection title="История побед (Челленджи)" icon={<History size={14}/>}>
                                    <div className="space-y-2">
                                        {selectedTask.challengeHistory.map((h, i) => (
                                            <div key={`hist-${i}`} className="text-xs text-slate-500 dark:text-slate-400 p-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <ReactMarkdown components={markdownComponents}>{h}</ReactMarkdown>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
                             <div className="flex gap-2">
                                 {['todo', 'doing', 'done'].map(col => (
                                     <button 
                                        key={col}
                                        onClick={() => {
                                            const updated = { ...selectedTask, column: col as any };
                                            updateTask(updated);
                                            setSelectedTask(updated);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${selectedTask.column === col ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                     >
                                         {col === 'todo' ? 'Надо' : col === 'doing' ? 'В процессе' : 'Готово'}
                                     </button>
                                 ))}
                             </div>
                             <button onClick={() => setSelectedTask(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                                 Закрыть
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kanban;