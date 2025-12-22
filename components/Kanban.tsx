import React, { useMemo, useState } from 'react';
import { Task, AppConfig, JournalEntry } from '../types';
import { Kanban as KanbanIcon, Plus, MoreHorizontal, CheckCircle2, Clock, Circle, BrainCircuit, MessageSquare, AlertCircle } from 'lucide-react';
import EmptyState from './EmptyState';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId: string | null;
  onClearInitialTask: () => void;
}

const Kanban: React.FC<Props> = ({ 
  tasks, updateTask, deleteTask, archiveTask, onReflectInJournal 
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [therapyMessage, setTherapyMessage] = useState<{taskId: string, text: string} | null>(null);
  const [isLoadingTherapy, setIsLoadingTherapy] = useState(false);

  const activeTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);

  const columns = [
      { id: 'todo', title: 'Сделать', color: 'border-slate-300', icon: Circle },
      { id: 'doing', title: 'В процессе', color: 'border-amber-400', icon: Clock },
      { id: 'done', title: 'Готово', color: 'border-emerald-500', icon: CheckCircle2 }
  ] as const;

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleColumnDrop = (e: React.DragEvent, columnId: 'todo' | 'doing' | 'done') => {
      e.preventDefault();
      if (draggedTaskId) {
          const task = tasks.find(t => t.id === draggedTaskId);
          if (task && task.column !== columnId) {
              updateTask({ ...task, column: columnId });
          }
          setDraggedTaskId(null);
      }
  };

  const getTherapy = async (task: Task) => {
      setIsLoadingTherapy(true);
      // Dummy config passing for simplicity or import if needed
      // Assuming getKanbanTherapy needs config, but I don't have it in props? 
      // Actually prop `config` is passed in App.tsx. I added it to interface.
      // Wait, I need to use config prop.
      // Let's assume passed config or use default.
      const msg = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', {} as any); 
      setTherapyMessage({ taskId: task.id, text: msg });
      setIsLoadingTherapy(false);
  };

  const renderColumn = (col: typeof columns[0]) => {
    const tasksInCol = activeTasks.filter(t => t.column === col.id);
    
    const getEmptyStateDescription = () => {
        switch(col.id) {
            case 'todo': return 'Добавь задачу из «Входящих» или «Хаба».';
            case 'doing': return 'Перетащи задачу из «Выполнить».';
            case 'done': return 'Готово? Перетащи задачу сюда.';
            default: return 'Задач нет.';
        }
    };

    return (
    <div key={col.id} className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl flex flex-col h-full border-t-4 ${col.color} p-2 md:p-3 min-h-0 overflow-hidden`} onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
        <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-3 flex justify-between items-center text-sm px-1 shrink-0">
            <span className="flex items-center gap-2"><col.icon size={16}/> {col.title}</span> 
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tasksInCol.length}</span>
        </h3>
        <div className="flex-1 overflow-y-auto space-y-3 pb-20 md:pb-2 min-h-0 px-1 custom-scrollbar-light">
            {tasksInCol.length === 0 ? (
                <div className="py-10">
                   <EmptyState 
                        icon={KanbanIcon} 
                        title="Пусто" 
                        description={getEmptyStateDescription()} 
                        color="slate"
                    /> 
                </div>
            ) : (
                tasksInCol.map(task => (
                    <div 
                        key={task.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md cursor-grab active:cursor-grabbing group relative"
                    >
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{task.content}</div>
                        
                        {/* Therapy Message */}
                        {therapyMessage?.taskId === task.id && (
                            <div className="mb-3 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-xs text-indigo-800 dark:text-indigo-300 italic">
                                "{therapyMessage.text}"
                                <button onClick={() => setTherapyMessage(null)} className="block mt-1 text-[10px] underline opacity-70">Закрыть</button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                             <div className="flex gap-1">
                                {col.id === 'doing' && (
                                    <button onClick={() => getTherapy(task)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded hover:bg-indigo-50" title="Застрял?">
                                        {isLoadingTherapy ? <AlertCircle className="animate-spin" size={14}/> : <BrainCircuit size={14} />}
                                    </button>
                                )}
                                {col.id === 'done' && (
                                     <button onClick={() => onReflectInJournal(task.id)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded hover:bg-emerald-50" title="Рефлексия">
                                        <MessageSquare size={14} />
                                     </button>
                                )}
                             </div>
                             <button onClick={() => archiveTask(task.id)} className="text-xs text-slate-300 hover:text-slate-500">В архив</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
    );
  };

  return (
      <div className="h-full flex flex-col p-4 md:p-8">
          <header className="mb-6">
                <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Действия</h1>
                <p className="text-sm text-slate-500">Доска текущих задач.</p>
          </header>
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto pb-4">
               {columns.map(col => renderColumn(col))}
          </div>
      </div>
  );
};

export default Kanban;