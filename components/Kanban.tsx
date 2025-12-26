import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, JournalEntry, AppConfig } from '../types';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Plus, MoreHorizontal, Calendar, Zap, MessageCircle, 
  CheckCircle2, Circle, ArrowUp, ArrowDown, Trash2, 
  Archive, RotateCcw, Play, CheckSquare, BrainCircuit,
  GripVertical, X
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

const Kanban: React.FC<Props> = ({ 
  tasks, journalEntries, config, 
  addTask, updateTask, deleteTask, reorderTask, archiveTask, 
  onReflectInJournal, initialTaskId, onClearInitialTask 
}) => {
  // State
  const [filterChallenge, setFilterChallenge] = useState<'all' | 'active' | 'none'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState<string | null>(null); // Task ID being processed
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Initial Task Context handling
  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find(t => t.id === initialTaskId);
      if (task) {
        setSelectedTask(task);
        onClearInitialTask?.();
      }
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  // Filtering and Sorting
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => !t.isArchived);

    if (filterChallenge === 'active') {
      result = result.filter(t => t.activeChallenge && !t.isChallengeCompleted);
    } else if (filterChallenge === 'none') {
      result = result.filter(t => !t.activeChallenge);
    }

    return result.sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.createdAt - b.createdAt 
        : b.createdAt - a.createdAt;
    });
  }, [tasks, filterChallenge, sortOrder]);

  // Columns
  const columns: {id: Task['column'], title: string, color: string}[] = [
    { id: 'todo', title: 'Надо сделать', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'doing', title: 'В процессе', color: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'done', title: 'Готово', color: 'bg-emerald-50 dark:bg-emerald-900/20' }
  ];

  // Actions
  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: Task['column'], targetTaskId?: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    const draggedTask = tasks.find(t => t.id === draggedId);
    
    if (draggedTask) {
        // If dropping onto another task in the same column, reorder
        if (targetTaskId && draggedTask.column === columnId && draggedId !== targetTaskId) {
            reorderTask(draggedId, targetTaskId);
        } else if (draggedTask.column !== columnId) {
            // Move to column
            updateTask({ ...draggedTask, column: columnId });
        }
    }
  };

  const handleAiTherapy = async (task: Task) => {
    setIsAiProcessing(task.id);
    const result = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config);
    if (result) {
        const history = task.consultationHistory || [];
        updateTask({ ...task, consultationHistory: [result, ...history] });
    }
    setIsAiProcessing(null);
  };

  const handleGenerateChallenge = async (task: Task) => {
    setIsAiProcessing(task.id);
    const result = await generateTaskChallenge(task.content, config);
    if (result) {
        updateTask({ 
            ...task, 
            activeChallenge: result,
            isChallengeCompleted: false,
            challengeHistory: task.activeChallenge ? [...(task.challengeHistory || []), task.activeChallenge] : task.challengeHistory
        });
    }
    setIsAiProcessing(null);
  };
  
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end p-4 md:p-8 shrink-0 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Фокус на главном</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-none">
             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                 <button onClick={() => setFilterChallenge('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Все</button>
                 <button onClick={() => setFilterChallenge('active')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'active' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Активные</button>
                 <button onClick={() => setFilterChallenge('none')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Обычные</button>
             </div>
             
             <Tooltip content={sortOrder === 'asc' ? "Старые сверху" : "Новые сверху"} side="left">
                 <button onClick={toggleSortOrder} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400">
                     {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                 </button>
             </Tooltip>
        </div>
      </header>

      {/* Main Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 pt-0">
          <div className="flex h-full gap-6 min-w-[800px] md:min-w-0">
               {columns.map(col => (
                   <div 
                     key={col.id} 
                     className="flex-1 flex flex-col min-w-[280px] rounded-2xl bg-white/50 dark:bg-[#1e293b]/50 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm"
                     onDragOver={handleDragOver}
                     onDrop={(e) => handleDrop(e, col.id)}
                   >
                       {/* Column Header */}
                       <div className={`p-4 rounded-t-2xl border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center ${col.color}`}>
                           <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{col.title}</h3>
                           <span className="bg-white dark:bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
                               {filteredTasks.filter(t => t.column === col.id).length}
                           </span>
                       </div>

                       {/* Tasks List */}
                       <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                           {col.id === 'todo' && (
                               <form onSubmit={handleAddTask} className="mb-4">
                                   <div className="relative">
                                       <input 
                                           type="text" 
                                           placeholder="Новая задача..." 
                                           className="w-full p-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-sm focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-slate-400 dark:text-slate-200"
                                           value={newTaskContent}
                                           onChange={(e) => setNewTaskContent(e.target.value)}
                                       />
                                       <button type="submit" disabled={!newTaskContent.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                                           <Plus size={16} />
                                       </button>
                                   </div>
                               </form>
                           )}

                           {filteredTasks.filter(t => t.column === col.id).map(task => (
                               <div 
                                   key={task.id}
                                   draggable
                                   onDragStart={(e) => handleDragStart(e, task.id)}
                                   onDrop={(e) => handleDrop(e, col.id, task.id)}
                                   onClick={() => setSelectedTask(task)}
                                   className={`group relative p-4 rounded-xl border bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-all cursor-pointer ${task.activeChallenge && !task.isChallengeCompleted ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-100 dark:ring-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                               >
                                   <div className="text-sm text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                                       {task.content}
                                   </div>
                                   
                                   {task.activeChallenge && (
                                       <div className={`text-xs p-2 rounded-lg mb-3 flex items-start gap-2 ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'}`}>
                                           <Zap size={12} className="shrink-0 mt-0.5" />
                                           <span className="line-clamp-2">{task.activeChallenge}</span>
                                       </div>
                                   )}

                                   <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                                       <div className="text-[10px] text-slate-400 font-mono">
                                           {new Date(task.createdAt).toLocaleDateString()}
                                       </div>
                                       
                                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button 
                                              onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
                                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                                              title="Архивировать"
                                           >
                                               <CheckSquare size={14} />
                                           </button>
                                       </div>
                                   </div>
                               </div>
                           ))}
                           
                           {filteredTasks.filter(t => t.column === col.id).length === 0 && col.id !== 'todo' && (
                               <div className="text-center py-10 text-slate-300 dark:text-slate-600 text-xs italic">
                                   Нет задач
                               </div>
                           )}
                       </div>
                   </div>
               ))}
          </div>
      </div>
      
      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)}
            updateTask={updateTask}
            onGenerateChallenge={() => handleGenerateChallenge(selectedTask)}
            onAiTherapy={() => handleAiTherapy(selectedTask)}
            isProcessing={isAiProcessing === selectedTask.id}
            onReflectInJournal={() => onReflectInJournal(selectedTask.id)}
            deleteTask={(id) => { deleteTask(id); setSelectedTask(null); }}
        />
      )}

    </div>
  );
};

// Internal sub-component for Task Details
const TaskDetailModal: React.FC<{
    task: Task;
    onClose: () => void;
    updateTask: (t: Task) => void;
    onGenerateChallenge: () => void;
    onAiTherapy: () => void;
    isProcessing: boolean;
    onReflectInJournal: () => void;
    deleteTask: (id: string) => void;
}> = ({ task, onClose, updateTask, onGenerateChallenge, onAiTherapy, isProcessing, onReflectInJournal, deleteTask }) => {
    const [editContent, setEditContent] = useState(task.content);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        updateTask({ ...task, content: editContent });
        setIsEditing(false);
    };
    
    // Markdown components
    const md = {
       p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm" {...props} />
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Детали задачи</h3>
                    <button onClick={onClose}><X className="text-slate-400" size={24} /></button>
                </div>
                
                {isEditing ? (
                    <textarea 
                        className="w-full h-32 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-slate-200 mb-4"
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                    />
                ) : (
                    <div onClick={() => setIsEditing(true)} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-6 cursor-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="text-slate-800 dark:text-slate-200 text-base">{task.content}</div>
                    </div>
                )}
                {isEditing && (
                    <div className="flex justify-end gap-2 mb-6">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-slate-500">Отмена</button>
                        <button onClick={handleSave} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs">Сохранить</button>
                    </div>
                )}

                {/* AI Tools */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button 
                        onClick={onGenerateChallenge}
                        disabled={isProcessing}
                        className="p-3 border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-bold flex flex-col items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                        {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Zap size={18} />}
                        Сгенерировать Челлендж
                    </button>
                    <button 
                        onClick={onAiTherapy}
                        disabled={isProcessing}
                        className="p-3 border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex flex-col items-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                        {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <BrainCircuit size={18} />}
                        Совет Консультанта
                    </button>
                </div>

                {/* Challenge Section */}
                {task.activeChallenge && (
                    <div className="mb-6 p-4 rounded-xl border border-indigo-200 bg-white dark:bg-slate-800 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-indigo-500">Текущий Вызов</span>
                            <button 
                                onClick={() => updateTask({...task, isChallengeCompleted: !task.isChallengeCompleted})}
                                className={`text-xs px-2 py-1 rounded font-bold ${task.isChallengeCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {task.isChallengeCompleted ? 'Выполнено' : 'В процессе'}
                            </button>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                            <ReactMarkdown components={md}>{task.activeChallenge}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Consultation History */}
                {task.consultationHistory && task.consultationHistory.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">История советов</h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar-light">
                            {task.consultationHistory.map((c, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                                    <ReactMarkdown components={md}>{c}</ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                    <button onClick={onReflectInJournal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                        <MessageCircle size={16} /> Рефлексия в Дневнике
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Kanban;
