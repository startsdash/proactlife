
import React, { useState, useMemo } from 'react';
import { Habit } from '../types';
import { Flame, CheckCircle2, Circle, Plus, Trash2, Calendar, Repeat, X, Trophy } from 'lucide-react';

interface Props {
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-64 md:h-96 text-center animate-in fade-in duration-500">
    <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
      <Flame size={48} className="text-indigo-200 dark:text-slate-700" />
    </div>
    <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 mb-2">Ритуалы не созданы</h3>
    <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">Создайте привычку, чтобы отслеживать прогресс и поддерживать огонь дисциплины.</p>
  </div>
);

const Heatmap: React.FC<{ habits: Habit[] }> = ({ habits }) => {
  const days = 14;
  const today = new Date();
  
  // Calculate activity level for last 14 days
  const data = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    d.setHours(0,0,0,0);
    const timestamp = d.getTime();
    
    // Count completions for this day across all habits
    let count = 0;
    habits.forEach(h => {
        // Check if habit history contains a timestamp within this day
        if (h.history.some(ts => {
            const histDate = new Date(ts);
            histDate.setHours(0,0,0,0);
            return histDate.getTime() === timestamp;
        })) {
            count++;
        }
    });
    
    return { date: d, count };
  });

  return (
    <div className="flex gap-1 md:gap-2 justify-end items-end h-8 md:h-12 mt-2">
        {data.map((d, i) => {
            let color = 'bg-slate-100 dark:bg-slate-800';
            if (d.count > 0) color = 'bg-indigo-200 dark:bg-indigo-900/50';
            if (d.count > 1) color = 'bg-indigo-400 dark:bg-indigo-600';
            if (d.count > 3) color = 'bg-indigo-600 dark:bg-indigo-400';
            
            const height = d.count === 0 ? 'h-full' : 'h-full'; // Simplified visual (just boxes)
            
            return (
                <div 
                    key={i} 
                    className={`flex-1 rounded-sm md:rounded transition-all hover:scale-110 cursor-default ${color} ${height}`}
                    title={`${d.date.toLocaleDateString()}: ${d.count} actions`}
                />
            );
        })}
    </div>
  );
};

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly'>('daily');

  // Helper to check if habit is done today
  const isDoneToday = (habit: Habit) => {
      const today = new Date().setHours(0,0,0,0);
      return habit.history.some(ts => new Date(ts).setHours(0,0,0,0) === today);
  };

  const toggleHabit = (habit: Habit) => {
      const today = new Date();
      const todayStart = new Date(today).setHours(0,0,0,0);
      
      const wasDone = isDoneToday(habit);
      let newHistory = [...habit.history];
      let newStreak = habit.streak;

      if (wasDone) {
          // UNDO
          newHistory = newHistory.filter(ts => new Date(ts).setHours(0,0,0,0) !== todayStart);
          // Simple streak decrement logic (not perfect recalculation but sufficient for UX)
          if (newStreak > 0) newStreak--;
      } else {
          // DO
          newHistory.push(today.getTime());
          
          // Check yesterday for streak
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStart = yesterday.setHours(0,0,0,0);
          
          const doneYesterday = habit.history.some(ts => new Date(ts).setHours(0,0,0,0) === yesterdayStart);
          
          if (doneYesterday || newStreak === 0) {
              newStreak++;
          } else {
              // Streak broken previously, reset to 1
              newStreak = 1; 
          }

          // Trigger Confetti Effect via DOM
          const card = document.getElementById(`habit-card-${habit.id}`);
          if (card) {
              card.classList.add('animate-pop');
              setTimeout(() => card.classList.remove('animate-pop'), 200);
          }
      }

      updateHabit({ ...habit, history: newHistory, streak: newStreak });
  };

  const handleAdd = () => {
      if (!newTitle.trim()) return;
      const h: Habit = {
          id: Date.now().toString(),
          title: newTitle,
          frequency: newFreq,
          createdAt: Date.now(),
          history: [],
          streak: 0,
          color: 'indigo'
      };
      addHabit(h);
      setNewTitle('');
      setIsAdding(false);
  };

  const sortedHabits = [...habits].sort((a, b) => {
      const aDone = isDoneToday(a);
      const bDone = isDoneToday(b);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1; // Move done to bottom
  });

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-100 tracking-tight">Ритуалы <span className="text-orange-500 text-lg">/ Дисциплина</span></h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Маленькие шаги каждый день.</p>
        </div>
        
        {/* Heatmap Widget */}
        {habits.length > 0 && (
            <div className="hidden md:block bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-64">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                    <span>Активность</span>
                    <span>14 дней</span>
                </div>
                <Heatmap habits={habits} />
            </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 pb-20">
         {habits.length === 0 && !isAdding ? (
             <div onClick={() => setIsAdding(true)} className="cursor-pointer">
                <EmptyState />
                <button className="mx-auto block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg">Создать первый ритуал</button>
             </div>
         ) : (
             <div className="space-y-3">
                 {/* Add New Form */}
                 {isAdding && (
                     <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg animate-in slide-in-from-top-2 mb-4">
                         <input 
                            autoFocus
                            className="w-full text-lg font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 bg-transparent outline-none mb-4"
                            placeholder="Название привычки (например, Медитация)"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                         />
                         <div className="flex justify-between items-center">
                             <div className="flex gap-2">
                                 <button onClick={() => setNewFreq('daily')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${newFreq === 'daily' ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Каждый день</button>
                                 <button onClick={() => setNewFreq('weekly')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${newFreq === 'weekly' ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Раз в неделю</button>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                                 <button onClick={handleAdd} className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg font-bold text-sm hover:opacity-90">Создать</button>
                             </div>
                         </div>
                     </div>
                 )}

                 {sortedHabits.map(habit => {
                     const isDone = isDoneToday(habit);
                     return (
                         <div 
                            id={`habit-card-${habit.id}`}
                            key={habit.id} 
                            onClick={() => toggleHabit(habit)}
                            className={`
                                group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4
                                ${isDone 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/50 opacity-70' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                                }
                            `}
                         >
                             {/* Checkbox Area */}
                             <div className={`
                                 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                                 ${isDone ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 group-hover:text-indigo-400'}
                             `}>
                                 {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                             </div>

                             {/* Content */}
                             <div className="flex-1 min-w-0">
                                 <h3 className={`font-semibold text-base truncate transition-colors ${isDone ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                     {habit.title}
                                 </h3>
                                 <div className="flex items-center gap-3 mt-1 text-xs">
                                     <span className={`flex items-center gap-1 font-bold ${habit.streak > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                                         <Flame size={12} fill={habit.streak > 0 ? "currentColor" : "none"} /> {habit.streak} дней
                                     </span>
                                     <span className="text-slate-400 dark:text-slate-600 flex items-center gap-1">
                                         {habit.frequency === 'daily' ? <Calendar size={12}/> : <Repeat size={12}/>}
                                         {habit.frequency === 'daily' ? 'Ежедневно' : 'Еженедельно'}
                                     </span>
                                 </div>
                             </div>

                             {/* Actions (Hover) */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); if(confirm('Удалить ритуал?')) deleteHabit(habit.id); }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <Trash2 size={18} />
                             </button>
                         </div>
                     );
                 })}
                 
                 {!isAdding && (
                     <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 font-medium"
                     >
                         <Plus size={20} /> Добавить ритуал
                     </button>
                 )}
             </div>
         )}
      </div>
    </div>
  );
};

export default Rituals;
