import React, { useState } from 'react';
import { Habit } from '../types';
import { Flame, Plus, X, Check, Save } from 'lucide-react';
import EmptyState from './EmptyState';
import ProgressStats from './ProgressStats';

interface Props {
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
}

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const openNewForm = () => setIsFormOpen(true);
  
  const handleCreate = () => {
      if (!newHabitName.trim()) return;
      const newHabit: Habit = {
          id: Date.now().toString(),
          title: newHabitName,
          color: 'indigo',
          icon: 'Flame',
          frequency: 'daily',
          reminders: [],
          history: {},
          streak: 0,
          bestStreak: 0,
          createdAt: Date.now()
      };
      addHabit(newHabit);
      setNewHabitName('');
      setIsFormOpen(false);
  };

  const toggleHabitToday = (habit: Habit) => {
      const today = new Date().toISOString().split('T')[0];
      const history = { ...habit.history };
      const isDone = !!history[today];
      
      if (isDone) delete history[today];
      else history[today] = true;
      
      // Calculate streak logic simplified
      const newStreak = isDone ? Math.max(0, habit.streak - 1) : habit.streak + 1; // Simplified streak logic
      
      updateHabit({ 
          ...habit, 
          history, 
          streak: newStreak
      });
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
        <header className="mb-6 flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Ритуалы</h1>
                <p className="text-sm text-slate-500">Архитектура привычек.</p>
             </div>
             <button onClick={openNewForm} className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg">
                <Plus size={20} />
             </button>
        </header>
        
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar-light">
             <ProgressStats habits={habits} />
             
             {isFormOpen && (
                 <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 mb-4 animate-in fade-in slide-in-from-top-2">
                     <div className="flex gap-2">
                         <input 
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Название привычки (например, Чтение 15 мин)"
                            autoFocus
                         />
                         <button onClick={handleCreate} className="p-2 bg-indigo-600 text-white rounded-lg"><Save size={18}/></button>
                         <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                     </div>
                 </div>
             )}

             <div className="space-y-3 pb-20">
                {habits.length === 0 && !isFormOpen ? (
                    <div className="py-10">
                        <EmptyState 
                            icon={Flame} 
                            title="Стриков пока нет" 
                            description="Заведи полезную привычку и отслеживай прогресс." 
                            color="orange"
                            actionLabel="Создать первый ритуал"
                            onAction={openNewForm}
                        />
                    </div>
                ) : (
                    habits.map(habit => {
                        const today = new Date().toISOString().split('T')[0];
                        const isDone = !!habit.history[today];
                        return (
                            <div key={habit.id} className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl border transition-all flex items-center justify-between group ${isDone ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Flame size={20} className={isDone ? 'fill-emerald-600' : ''} />
                                    </div>
                                    <div>
                                        <h3 className={`font-medium ${isDone ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{habit.title}</h3>
                                        <div className="text-xs text-slate-400 flex items-center gap-2">
                                            <span className="font-bold text-orange-500">🔥 {habit.streak} дней</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => toggleHabitToday(habit)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                                >
                                    <Check size={20} strokeWidth={3} />
                                </button>
                            </div>
                        );
                    })
                )}
             </div>
        </div>
    </div>
  );
};

export default Rituals;