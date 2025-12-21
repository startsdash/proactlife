
import React, { useState, useEffect } from 'react';
import { Habit, HabitFrequency } from '../types';
import { notificationService } from '../services/notificationService';
import { Flame, Check, Plus, Trash2, X, Zap, Calendar, Repeat, Bell, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';

interface Props {
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
}

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(Notification.permission === 'granted');

  // New Habit State
  const [newTitle, setNewTitle] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetDays, setTargetDays] = useState<number[]>([]); // 0-6
  const [targetCount, setTargetCount] = useState<number>(3);
  const [reminderTime, setReminderTime] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionGranted(granted);
  };

  const handleAddHabit = () => {
    if (!newTitle.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      title: newTitle,
      color: 'indigo',
      icon: 'Zap',
      frequency,
      targetDays: frequency === 'specific_days' ? targetDays : undefined,
      targetCount: frequency === 'times_per_week' ? targetCount : undefined,
      reminders: reminderTime ? [reminderTime] : [],
      history: {},
      streak: 0,
      bestStreak: 0,
      createdAt: Date.now()
    };

    addHabit(habit);
    
    // Schedule notification if permission granted
    if (permissionGranted && reminderTime) {
        notificationService.schedule(`Пора выполнить ритуал: ${newTitle}`, "Маленькие шаги ведут к большим целям.", reminderTime);
    }

    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle('');
    setFrequency('daily');
    setTargetDays([]);
    setTargetCount(3);
    setReminderTime('');
  };

  const toggleDay = (dayIndex: number) => {
    if (targetDays.includes(dayIndex)) {
      setTargetDays(targetDays.filter(d => d !== dayIndex));
    } else {
      setTargetDays([...targetDays, dayIndex]);
    }
  };

  const checkHabit = (habit: Habit) => {
    const isCompleted = !!habit.history[todayStr];
    
    const newHistory = { ...habit.history };
    if (isCompleted) {
        delete newHistory[todayStr];
    } else {
        newHistory[todayStr] = true;
    }

    // Recalculate Streak
    // Simple logic: consecutive days backwards from today/yesterday
    let currentStreak = 0;
    let checkDate = new Date();
    
    // If we just unchecked today, we start checking from yesterday
    // If we checked today, we start from today
    // Actually, let's just iterate backwards from today
    
    // Normalize checkDate to midnight
    checkDate.setHours(0,0,0,0);
    
    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (newHistory[dateStr]) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Allow skipping "yesterday" if we just haven't done it YET today?
            // Standard streak logic: if today is NOT done, check yesterday. 
            // If yesterday is done, streak continues.
            // If today IS done, streak includes today.
            
            // Re-eval approach:
            // 1. Check today. If done, streak = 1 + check yesterday...
            // 2. If today not done, check yesterday. If done, streak = 0 + check yesterday... (visual streak usually shows previous)
            // But for simple "current streak" number:
            
            // Let's stick to: count consecutive completed days ending today or yesterday.
            if (dateStr === todayStr && !isCompleted) { 
                // If checking specifically today (which is unchecked in newHistory), skip to yesterday to see if streak is preserved
                 checkDate.setDate(checkDate.getDate() - 1);
                 continue;
            }
            break;
        }
    }

    const updatedHabit = {
        ...habit,
        history: newHistory,
        streak: currentStreak,
        bestStreak: Math.max(habit.bestStreak, currentStreak)
    };

    updateHabit(updatedHabit);
  };

  const getWeekProgress = (habit: Habit) => {
    // Count completions in the last 7 days (including today)
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
        const dateStr = d.toISOString().split('T')[0];
        if (habit.history[dateStr]) count++;
        d.setDate(d.getDate() - 1);
    }
    return count;
  };

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className="h-full p-4 md:p-8 flex flex-col overflow-hidden relative">
      <header className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Ритуалы <span className="text-orange-500 text-lg">/ Системы</span></h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Мы — это то, что мы делаем постоянно.</p>
        </div>
        {!isAdding && (
            <button 
                onClick={() => setIsAdding(true)} 
                className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
                <Plus size={24} />
            </button>
        )}
      </header>

      {/* NOTIFICATION BANNER */}
      {!permissionGranted && (
         <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-indigo-800 rounded-lg text-indigo-500"><Bell size={18} /></div>
                <div className="text-sm text-indigo-900 dark:text-indigo-200">
                    <div className="font-bold">Включите напоминания</div>
                    <div className="opacity-80">Чтобы не пропускать ритуалы.</div>
                </div>
            </div>
            <button onClick={requestNotificationPermission} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Включить</button>
         </div>
      )}

      {/* ADD HABIT FORM */}
      <AnimatePresence>
      {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
              <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Новый Ритуал</h3>
                      <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <input 
                        className="w-full text-lg font-medium border-b-2 border-slate-100 dark:border-slate-700 bg-transparent py-2 outline-none focus:border-indigo-500 placeholder:text-slate-300 dark:text-slate-200"
                        placeholder="Название (например: Медитация)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                      />

                      <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Частота</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setFrequency('daily')} className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'daily' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Каждый день</button>
                                  <button onClick={() => setFrequency('specific_days')} className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'specific_days' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Дни недели</button>
                                  <button onClick={() => setFrequency('times_per_week')} className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'times_per_week' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>X раз в нед.</button>
                              </div>
                          </div>
                          
                          <div className="w-full md:w-1/3 space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Напоминание</label>
                              <input 
                                type="time" 
                                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-indigo-500 dark:text-slate-200"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                              />
                          </div>
                      </div>

                      {frequency === 'specific_days' && (
                          <div className="flex justify-between gap-1 pt-2">
                              {daysOfWeek.map((day, idx) => (
                                  <button 
                                    key={day}
                                    onClick={() => toggleDay(idx)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${targetDays.includes(idx) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                  >
                                      {day}
                                  </button>
                              ))}
                          </div>
                      )}

                      {frequency === 'times_per_week' && (
                          <div className="pt-2">
                              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Сколько раз в неделю: {targetCount}</label>
                              <input 
                                type="range" 
                                min="1" 
                                max="7" 
                                value={targetCount} 
                                onChange={(e) => setTargetCount(parseInt(e.target.value))}
                                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-slate-300 mt-1"><span>1</span><span>7</span></div>
                          </div>
                      )}

                      <div className="pt-4 flex justify-end">
                          <button 
                            onClick={handleAddHabit}
                            disabled={!newTitle.trim()}
                            className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                              Создать ритуал
                          </button>
                      </div>
                  </div>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar-light space-y-3">
          {habits.length === 0 && !isAdding ? (
              <div className="py-10">
                  <EmptyState 
                    icon={Flame} 
                    title="Ритуалов пока нет" 
                    description="Создайте полезную привычку, чтобы начать стрик." 
                    color="orange"
                    actionLabel="Создать первый ритуал"
                    onAction={() => setIsAdding(true)}
                  />
              </div>
          ) : (
              habits.map(habit => {
                  const isCompletedToday = !!habit.history[todayStr];
                  const weekProgress = getWeekProgress(habit);
                  
                  let progressPercent = 0;
                  if (habit.frequency === 'daily') progressPercent = isCompletedToday ? 100 : 0; // Simple logic
                  else if (habit.frequency === 'times_per_week') progressPercent = Math.min(100, (weekProgress / (habit.targetCount || 1)) * 100);
                  // Specific days logic omitted for brevity, assumed daily check is key
                  
                  const isFire = habit.streak > 2;

                  return (
                      <div key={habit.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                          {/* PROGRESS BAR BACKGROUND (Optional subtle indication) */}
                          <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full">
                              <div 
                                className={`h-full transition-all duration-1000 ${isCompletedToday ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                                style={{ width: `${habit.frequency === 'times_per_week' ? progressPercent : (isCompletedToday ? 100 : 0)}%` }} 
                              />
                          </div>

                          <button 
                             onClick={() => checkHabit(habit)}
                             className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                                 isCompletedToday 
                                 ? 'bg-emerald-500 border-emerald-200 text-white scale-105 shadow-emerald-200 shadow-lg' 
                                 : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:border-orange-200 hover:text-orange-400'
                             }`}
                          >
                              {isCompletedToday ? <Check size={28} strokeWidth={3} /> : <Circle size={28} />}
                          </button>

                          <div className="flex-1 min-w-0">
                              <h3 className={`text-lg font-bold truncate transition-colors ${isCompletedToday ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{habit.title}</h3>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                  <div className={`flex items-center gap-1 font-medium ${isFire ? 'text-orange-500 animate-pulse' : ''}`}>
                                      <Flame size={12} fill={isFire ? "currentColor" : "none"} /> {habit.streak} дней
                                  </div>
                                  {habit.frequency === 'times_per_week' && (
                                      <div className="flex items-center gap-1">
                                          <Repeat size={12} /> {weekProgress}/{habit.targetCount} на этой неделе
                                      </div>
                                  )}
                                  {habit.frequency === 'specific_days' && (
                                      <div className="flex items-center gap-1">
                                          <Calendar size={12} /> По дням
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          <button onClick={() => { if(confirm("Удалить ритуал?")) deleteHabit(habit.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-opacity">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default Rituals;
