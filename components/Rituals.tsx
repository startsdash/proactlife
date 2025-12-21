
import React, { useState } from 'react';
import { Habit, HabitFrequency } from '../types';
import { notificationService } from '../services/notificationService';
import { Flame, Check, Plus, Trash2, X, Zap, Calendar, Repeat, Bell, GripVertical, CheckCircle2, Circle, Edit2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import ProgressStats from './ProgressStats';

interface Props {
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
}

// Helper to get local date string YYYY-MM-DD
const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(Notification.permission === 'granted');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetDays, setTargetDays] = useState<number[]>([]); // 0-6
  const [targetCount, setTargetCount] = useState<number>(3);
  const [reminderTime, setReminderTime] = useState('');

  const todayStr = getLocalDateKey(new Date());

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionGranted(granted);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (habit: Habit) => {
    setEditingId(habit.id);
    setNewTitle(habit.title);
    setFrequency(habit.frequency);
    setTargetDays(habit.targetDays || []);
    setTargetCount(habit.targetCount || 3);
    setReminderTime(habit.reminders?.[0] || '');
    setIsFormOpen(true);
  };

  const handleSaveHabit = () => {
    if (!newTitle.trim()) return;

    if (editingId) {
        // UPDATE EXISTING
        const existing = habits.find(h => h.id === editingId);
        if (existing) {
            const updated: Habit = {
                ...existing,
                title: newTitle,
                frequency,
                targetDays: frequency === 'specific_days' ? targetDays : undefined,
                targetCount: (frequency === 'times_per_week' || frequency === 'times_per_day') ? targetCount : undefined,
                reminders: reminderTime ? [reminderTime] : [],
                // Preserve history and stats
            };
            updateHabit(updated);
        }
    } else {
        // CREATE NEW
        const habit: Habit = {
          id: Date.now().toString(),
          title: newTitle,
          color: 'indigo',
          icon: 'Zap',
          frequency,
          targetDays: frequency === 'specific_days' ? targetDays : undefined,
          targetCount: (frequency === 'times_per_week' || frequency === 'times_per_day') ? targetCount : undefined,
          reminders: reminderTime ? [reminderTime] : [],
          history: {},
          streak: 0,
          bestStreak: 0,
          createdAt: Date.now()
        };
        addHabit(habit);
    }
    
    // Schedule notification if permission granted
    if (permissionGranted && reminderTime) {
        notificationService.schedule(`Пора выполнить ритуал: ${newTitle}`, "Маленькие шаги ведут к большим целям.", reminderTime);
    }

    setIsFormOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
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

  // Helper: Determine if a day is fully completed based on habit config
  const isDayCompleted = (habit: Habit, dateStr: string, value: boolean | number | undefined): boolean => {
      if (!value) return false;
      if (habit.frequency === 'times_per_day') {
          return (typeof value === 'number' ? value : 0) >= (habit.targetCount || 1);
      }
      return !!value; // For boolean habits (daily, specific_days, times_per_week tracking)
  };

  const checkHabit = (habit: Habit) => {
    // Defensive coding for history
    const history = habit.history || {};
    const rawVal = history[todayStr];
    const newHistory = { ...history };
    
    let isNowCompleted = false;

    // LOGIC FOR TIMES PER DAY
    if (habit.frequency === 'times_per_day') {
        const target = habit.targetCount || 1;
        const currentCount = typeof rawVal === 'number' ? rawVal : (rawVal ? target : 0);
        
        if (currentCount >= target) {
            // If already done, toggle off (reset to 0/undefined) to allow undoing
            delete newHistory[todayStr];
        } else {
            // Increment
            const nextCount = currentCount + 1;
            newHistory[todayStr] = nextCount;
            // Check if this increment completed it
            if (nextCount >= target) isNowCompleted = true;
        }
    } 
    // LOGIC FOR BOOLEAN HABITS
    else {
        if (rawVal) {
            delete newHistory[todayStr];
        } else {
            newHistory[todayStr] = true;
            isNowCompleted = true;
        }
    }

    // TRIGGER CONFETTI if completing
    if (isNowCompleted && window.confetti) {
        window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
        });
    }

    // --- RECALCULATE STREAK ---
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    
    // 1. Check if "Today" contributes to streak
    const todayFormatted = getLocalDateKey(checkDate);
    const isTodayDone = isDayCompleted(habit, todayFormatted, newHistory[todayFormatted]);
    
    let tempDate = new Date();
    tempDate.setDate(tempDate.getDate() - 1); // Start checking from yesterday
    
    while (true) {
        const dStr = getLocalDateKey(tempDate);
        const val = newHistory[dStr];
        if (isDayCompleted(habit, dStr, val)) {
            currentStreak++;
            tempDate.setDate(tempDate.getDate() - 1);
        } else {
            break;
        }
    }

    if (isTodayDone) {
        currentStreak++;
    }

    const updatedHabit = {
        ...habit,
        history: newHistory,
        streak: currentStreak,
        bestStreak: Math.max(habit.bestStreak || 0, currentStreak)
    };

    updateHabit(updatedHabit);
  };

  const getWeekProgress = (habit: Habit) => {
    let count = 0;
    const d = new Date();
    const history = habit.history || {};
    for (let i = 0; i < 7; i++) {
        const dateStr = getLocalDateKey(d);
        if (history[dateStr]) count++;
        d.setDate(d.getDate() - 1);
    }
    return count;
  };

  const getBarColorClass = (percent: number) => {
      if (percent >= 100) return 'bg-emerald-500';
      if (percent >= 66) return 'bg-indigo-500';
      if (percent >= 33) return 'bg-orange-500';
      return 'bg-rose-500';
  };

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light p-4 md:p-8 relative">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Ритуалы <span className="text-orange-500 text-lg">/ Системы</span></h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Мы — это то, что мы делаем постоянно.</p>
        </div>
        {!isFormOpen && (
            <button 
                onClick={openNewForm} 
                className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
                <Plus size={24} />
            </button>
        )}
      </header>

      {/* PROGRESS VISUALIZATION */}
      {habits.length > 0 && !isFormOpen && (
          <ProgressStats habits={habits} />
      )}

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

      {/* HABIT FORM */}
      <AnimatePresence>
      {isFormOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
              <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{editingId ? 'Редактировать Ритуал' : 'Новый Ритуал'}</h3>
                      <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <input 
                        className="w-full text-lg font-medium border-b-2 border-slate-100 dark:border-slate-700 bg-transparent py-2 outline-none focus:border-indigo-500 placeholder:text-slate-300 dark:text-slate-200"
                        placeholder="Название (например: Медитация)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                      />

                      <div className="flex flex-col gap-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Частота</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <button onClick={() => setFrequency('daily')} className={`py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'daily' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Каждый день</button>
                                  <button onClick={() => setFrequency('specific_days')} className={`py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'specific_days' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>Дни недели</button>
                                  <button onClick={() => setFrequency('times_per_week')} className={`py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'times_per_week' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>X раз в неделю</button>
                                  <button onClick={() => setFrequency('times_per_day')} className={`py-2 px-3 rounded-lg border text-sm transition-colors ${frequency === 'times_per_day' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>X раз в день</button>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={12}/> Напоминание</label>
                              <input 
                                type="time" 
                                className="w-full md:w-40 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-indigo-500 dark:text-slate-200"
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

                      {(frequency === 'times_per_week' || frequency === 'times_per_day') && (
                          <div className="pt-2">
                              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                                  {frequency === 'times_per_week' ? `Сколько раз в неделю: ${targetCount}` : `Сколько раз в день: ${targetCount}`}
                              </label>
                              <input 
                                type="range" 
                                min="1" 
                                max={frequency === 'times_per_week' ? "7" : "20"} 
                                value={targetCount} 
                                onChange={(e) => setTargetCount(parseInt(e.target.value))}
                                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-slate-300 mt-1"><span>1</span><span>{frequency === 'times_per_week' ? '7' : '20'}</span></div>
                          </div>
                      )}

                      <div className="pt-4 flex justify-end">
                          <button 
                            onClick={handleSaveHabit}
                            disabled={!newTitle.trim()}
                            className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                              {editingId ? 'Сохранить изменения' : 'Создать ритуал'}
                          </button>
                      </div>
                  </div>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      <div className="space-y-3 pb-20">
          {habits.length === 0 && !isFormOpen ? (
              <div className="py-10">
                  <EmptyState 
                    icon={Flame} 
                    title="Ритуалов пока нет" 
                    description="Создайте полезную привычку, чтобы начать стрик." 
                    color="orange"
                    actionLabel="Создать первый ритуал"
                    onAction={openNewForm}
                  />
              </div>
          ) : (
              habits.map(habit => {
                  const history = habit.history || {};
                  const todayVal = history[todayStr];
                  const isCompletedToday = isDayCompleted(habit, todayStr, todayVal);
                  
                  // Progress Calculation
                  let progressPercent = 0;
                  if (habit.frequency === 'daily' || habit.frequency === 'specific_days') {
                      progressPercent = isCompletedToday ? 100 : 0;
                  } else if (habit.frequency === 'times_per_week') {
                      const weekProgress = getWeekProgress(habit);
                      progressPercent = Math.min(100, (weekProgress / (habit.targetCount || 1)) * 100);
                  } else if (habit.frequency === 'times_per_day') {
                      const count = typeof todayVal === 'number' ? todayVal : (todayVal ? (habit.targetCount || 1) : 0);
                      progressPercent = Math.min(100, (count / (habit.targetCount || 1)) * 100);
                  }

                  const streak = habit.streak || 0;
                  const isFire = streak > 2;
                  
                  // Render Value inside circle for counters
                  const currentCountDisplay = typeof todayVal === 'number' ? todayVal : (todayVal ? (habit.targetCount || 1) : 0);
                  const targetDisplay = habit.targetCount || 1;
                  const countLabel = habit.frequency === 'times_per_day' 
                    ? `${currentCountDisplay}/${targetDisplay}` 
                    : null;

                  return (
                      <div key={habit.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                          {/* PROGRESS BAR BACKGROUND */}
                          <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full">
                              <motion.div 
                                className={`h-full ${getBarColorClass(progressPercent)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5 }}
                              />
                          </div>

                          <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={() => checkHabit(habit)}
                             className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-4 relative overflow-hidden transition-all shadow-sm ${
                                 isCompletedToday 
                                 ? 'bg-emerald-500 border-emerald-200 text-white shadow-emerald-200' 
                                 : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:border-orange-200 hover:text-orange-400'
                             }`}
                          >
                                <AnimatePresence mode="wait">
                                    {isCompletedToday ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            <Check size={24} strokeWidth={3} />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="circle"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                        >
                                            {countLabel ? <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{countLabel}</span> : <Circle size={24} />}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                          </motion.button>

                          <div className="flex-1 min-w-0">
                              <h3 className={`text-lg font-bold truncate transition-colors ${isCompletedToday ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{habit.title}</h3>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                  <div className={`flex items-center gap-1 font-medium ${isFire ? 'text-orange-500 animate-pulse' : ''}`}>
                                      <Flame size={12} fill={isFire ? "currentColor" : "none"} /> {streak} дней
                                  </div>
                                  {habit.frequency === 'times_per_week' && (
                                      <div className="flex items-center gap-1">
                                          <Repeat size={12} /> {getWeekProgress(habit)}/{habit.targetCount || 1} на этой неделе
                                      </div>
                                  )}
                                  {habit.frequency === 'specific_days' && (
                                      <div className="flex items-center gap-1">
                                          <Calendar size={12} /> По дням
                                      </div>
                                  )}
                                  {habit.frequency === 'times_per_day' && (
                                      <div className="flex items-center gap-1 text-indigo-500">
                                          <Repeat size={12} /> Цель: {habit.targetCount || 1} в день
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditForm(habit)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Редактировать">
                                  <Edit2 size={18} />
                              </button>
                              <button onClick={() => { if(confirm("Удалить ритуал?")) deleteHabit(habit.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Удалить">
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default Rituals;
