
import React, { useState } from 'react';
import { Habit, HabitFrequency } from '../types';
import { notificationService } from '../services/notificationService';
import { Flame, Check, Plus, Trash2, X, Zap, Calendar, Repeat, Bell, GripVertical, CheckCircle2, Circle, Edit2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import ProgressStats from './ProgressStats';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP } from '../constants';

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

// Reusable Sphere Selector (Local Definition)
const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="flex gap-2">
            {SPHERES.map(s => {
                const isSelected = selected.includes(s.id);
                const Icon = ICON_MAP[s.icon];
                return (
                    <button
                        key={s.id}
                        onClick={() => toggleSphere(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${
                            isSelected 
                            ? `${s.bg} ${s.text} ${s.border}` 
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {Icon && <Icon size={12} />}
                        {s.label}
                    </button>
                );
            })}
        </div>
    );
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
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);

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
    setSelectedSpheres(habit.spheres || []);
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
                spheres: selectedSpheres
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
          spheres: selectedSpheres,
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
    setSelectedSpheres([]);
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
          <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Трекер</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Автопилот полезных привычек</p>
        </div>
        {!isFormOpen && (
            <Tooltip content="Новая привычка">
                <button 
                    onClick={openNewForm} 
                    className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                    <Plus size={24} />
                </button>
            </Tooltip>
        )}
      </header>

      {/* STATS */}
      {!isFormOpen && habits.length > 0 && (
          <div className="mb-8">
              <ProgressStats habits={habits} />
          </div>
      )}

      {/* FORM */}
      <AnimatePresence>
        {isFormOpen && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8"
            >
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{editingId ? 'Редактировать привычку' : 'Новый ритуал'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Название</label>
                        <input 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                            placeholder="Например: Читать 30 минут"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Сферы</label>
                        <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Частота</label>
                            <select 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                            >
                                <option value="daily">Ежедневно</option>
                                <option value="specific_days">Дни недели</option>
                                <option value="times_per_week">Раз в неделю</option>
                                <option value="times_per_day">Раз в день (Счетчик)</option>
                            </select>
                        </div>
                        
                        {(frequency === 'times_per_week' || frequency === 'times_per_day') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Цель (Кол-во)</label>
                                <input 
                                    type="number"
                                    min="1"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(parseInt(e.target.value))}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Напоминание</label>
                            <input 
                                type="time"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {frequency === 'specific_days' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Дни недели</label>
                            <div className="flex gap-2">
                                {daysOfWeek.map((day, idx) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(idx)}
                                        className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${targetDays.includes(idx) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                        <button onClick={requestNotificationPermission} className={`text-xs flex items-center gap-1 ${permissionGranted ? 'text-emerald-500' : 'text-slate-400 hover:text-indigo-500'}`}>
                            <Bell size={12} /> {permissionGranted ? 'Уведомления включены' : 'Включить уведомления'}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">Отмена</button>
                        <button onClick={handleSaveHabit} className="flex-1 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium shadow-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">Сохранить</button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* HABIT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
          {habits.length === 0 && !isFormOpen ? (
              <div className="col-span-full py-10">
                  <EmptyState 
                      icon={Flame} 
                      title="Нет привычек" 
                      description="Создай свой первый ритуал, чтобы начать серию побед" 
                      color="orange"
                      actionLabel="Создать привычку"
                      onAction={openNewForm}
                  />
              </div>
          ) : (
              habits.map(habit => {
                  const isDoneToday = isDayCompleted(habit, todayStr, habit.history[todayStr]);
                  const historyValue = habit.history[todayStr];
                  const progress = habit.frequency === 'times_per_day' && typeof historyValue === 'number' 
                        ? Math.min(100, Math.round((historyValue / (habit.targetCount || 1)) * 100))
                        : (isDoneToday ? 100 : 0);

                  return (
                      <div key={habit.id} className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                          {/* Progress Bar Background */}
                          <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full">
                              <div className={`h-full transition-all duration-500 ${getBarColorClass(progress)}`} style={{ width: `${progress}%` }} />
                          </div>

                          <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="flex flex-col">
                                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight">{habit.title}</h3>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                      <span className="flex items-center gap-1"><Flame size={12} className={habit.streak > 0 ? "text-orange-500" : ""} /> {habit.streak} дн.</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1"><Calendar size={12} /> {getWeekProgress(habit)}/7</span>
                                  </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditForm(habit)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Edit2 size={16} /></button>
                                  <button onClick={() => { if(confirm("Удалить привычку?")) deleteHabit(habit.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                              </div>
                          </div>

                          <div className="flex justify-between items-end relative z-10">
                              <div className="flex gap-1">
                                  {habit.spheres?.map(sid => {
                                      const s = SPHERES.find(x => x.id === sid);
                                      if (!s) return null;
                                      return (
                                          <div key={sid} className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30', '')}`} title={s.label} />
                                      );
                                  })}
                              </div>
                              <button 
                                  onClick={() => checkHabit(habit)}
                                  className={`
                                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95
                                      ${isDoneToday 
                                          ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      }
                                  `}
                              >
                                  {isDoneToday ? <Check size={18} strokeWidth={3} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 dark:border-slate-500" />}
                                  {habit.frequency === 'times_per_day' 
                                    ? `${historyValue || 0}/${habit.targetCount}`
                                    : (isDoneToday ? 'Готово' : 'Сделать')
                                  }
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
