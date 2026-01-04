
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitFrequency } from '../types';
import { notificationService } from '../services/notificationService';
import { Flame, Check, Plus, Trash2, X, Zap, Calendar, Repeat, Bell, GripVertical, CheckCircle2, Circle, Edit2, Clock, Sparkles, Diamond, Activity, MoreHorizontal, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP } from '../constants';

interface Props {
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
}

// --- CONSTANTS & HELPERS ---

const NEON_COLORS: Record<string, string> = {
    productivity: '#6366f1', // Indigo
    growth: '#10b981',       // Emerald
    relationships: '#f43f5e', // Rose
    default: '#94a3b8'       // Slate
};

const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '24px 24px'
};

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getSphereColor = (spheres?: string[]) => {
    if (!spheres || spheres.length === 0) return NEON_COLORS.default;
    return NEON_COLORS[spheres[0]] || NEON_COLORS.default;
};

// --- COMPONENTS ---

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 40},${20 - (d / max) * 20}`).join(' ');

    return (
        <svg width="40" height="20" className="overflow-visible opacity-50">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const AuraRingButton = ({ isDone, onClick, color, progress = 0 }: { isDone: boolean, onClick: (e: React.MouseEvent) => void, color: string, progress?: number }) => {
    return (
        <button 
            onClick={onClick}
            className="relative w-8 h-8 flex items-center justify-center group outline-none"
        >
            {/* Background Ring - Collapses on Done */}
            <div className={`absolute inset-0 rounded-full border border-slate-300 dark:border-slate-600 transition-all duration-300 ease-out ${isDone ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`} />
            
            {/* Active Fill - Fades In */}
            <motion.div 
                initial={false}
                animate={{ 
                    scale: isDone ? 1 : progress > 0 ? progress : 0,
                    opacity: isDone || progress > 0 ? 1 : 0
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color, boxShadow: isDone ? `0 0 10px ${color}66` : 'none' }}
            />

            {/* Icon */}
            <div className={`relative z-10 transition-all duration-300 ${isDone ? 'text-white scale-100' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 scale-75'}`}>
                {isDone ? <Check size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
            </div>
        </button>
    );
};

const RhythmRow = ({ habit, dates, onToggle, color, todayStr }: { habit: Habit, dates: Date[], onToggle: (date: Date) => void, color: string, todayStr: string }) => {
    return (
        <div className="flex items-center justify-between gap-1 h-full px-4 relative">
            {/* SVG Connecting Line Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
                <defs>
                    <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {dates.map((date, i) => {
                    if (i === 0) return null;
                    const prevDate = dates[i-1];
                    const dateKey = getLocalDateKey(date);
                    const prevKey = getLocalDateKey(prevDate);
                    
                    const isDone = !!habit.history[dateKey];
                    const isPrevDone = !!habit.history[prevKey];

                    if (isDone && isPrevDone) {
                        // Assuming uniform distribution in flex container
                        const step = 100 / (dates.length - 1); 
                        const startX = (i - 1) * step; 
                        const endX = i * step; 
                        
                        // Using percentages for x1/x2 to match flex distribution roughly
                        // Note: SVG lines in flex container might be tricky without fixed width.
                        // Ideally we use fixed width cells. Let's use simple logic:
                        // Since we can't easily get exact pixel centers without ref, we skip lines or
                        // rely on the visual "dots" which is cleaner for this aesthetic.
                        // SKIPPING LINE RENDER FOR CLEANER LOOK & PERFORMANCE IN FLEX LAYOUT
                    }
                    return null;
                })}
            </svg>

            {dates.map(date => {
                const dateKey = getLocalDateKey(date);
                const val = habit.history[dateKey];
                const isDone = !!val;
                const isToday = dateKey === todayStr;
                
                return (
                    <div key={dateKey} className={`w-7 h-full flex items-center justify-center relative z-10 ${isToday ? 'bg-gradient-to-b from-transparent via-indigo-50/50 to-transparent dark:via-indigo-900/10' : ''}`}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(date); }}
                            className="group relative w-full h-8 flex items-center justify-center outline-none"
                        >
                            <motion.div 
                                initial={false}
                                animate={{ 
                                    width: isDone ? 6 : 4,
                                    height: isDone ? 6 : 4,
                                    backgroundColor: isDone ? color : '#94a3b8', 
                                    opacity: isDone ? 1 : 0.2
                                }}
                                className="rounded-full shadow-sm"
                                style={{ boxShadow: isDone ? `0 0 6px ${color}` : 'none' }}
                            />
                            {/* Hover Ghost */}
                            <div className={`absolute inset-0 rounded-full bg-slate-400/10 scale-0 group-hover:scale-50 transition-transform duration-200`} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

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

// --- MAIN COMPONENT ---

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [description, setDescription] = useState(''); 
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetCount, setTargetCount] = useState<number>(1);
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);

  // Date Range for Grid (Last 14 days)
  const dates = useMemo(() => {
      const arr = [];
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          arr.push(d);
      }
      return arr;
  }, []);

  const todayStr = getLocalDateKey(new Date());

  // Calculate System Status
  const activeHabitsCount = habits.filter(h => !h.isArchived).length;
  const completedTodayCount = habits.filter(h => h.history[todayStr]).length;
  const syncRate = activeHabitsCount > 0 ? Math.round((completedTodayCount / activeHabitsCount) * 100) : 0;

  const handleToggle = (habit: Habit, date: Date) => {
      const dStr = getLocalDateKey(date);
      const history = { ...habit.history };
      const currentVal = history[dStr];

      if (currentVal) {
          delete history[dStr];
      } else {
          history[dStr] = true;
          if (dStr === todayStr && window.confetti) {
             window.confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: [getSphereColor(habit.spheres)] }); 
          }
      }
      updateHabit({ ...habit, history });
  };

  const handleSave = () => {
      if (!newTitle.trim()) return;
      
      const baseHabit = {
          title: newTitle,
          description,
          frequency,
          targetCount: frequency === 'times_per_day' ? targetCount : undefined,
          spheres: selectedSpheres,
          color: 'indigo', 
          icon: 'Zap'
      };

      if (editingHabit) {
          updateHabit({ ...editingHabit, ...baseHabit });
      } else {
          addHabit({
              id: Date.now().toString(),
              createdAt: Date.now(),
              history: {},
              streak: 0,
              bestStreak: 0,
              reminders: [],
              ...baseHabit
          });
      }
      closeForm();
  };

  const closeForm = () => {
      setIsFormOpen(false);
      setEditingHabit(null);
      setNewTitle('');
      setDescription('');
      setFrequency('daily');
      setSelectedSpheres([]);
  };

  const openNew = () => {
      closeForm();
      setIsFormOpen(true);
  };

  const openEdit = (h: Habit) => {
      setEditingHabit(h);
      setNewTitle(h.title);
      setDescription(h.description || '');
      setFrequency(h.frequency);
      setTargetCount(h.targetCount || 1);
      setSelectedSpheres(h.spheres || []);
      setIsFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        {/* Background Dot Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10" style={DOT_GRID_STYLE} />

        <header className="p-6 md:p-8 flex justify-between items-end shrink-0 z-10">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Трекер</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Ритм твоей жизни</p>
            </div>
            {!isFormOpen && (
                <button onClick={openNew} className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Plus size={24} />
                </button>
            )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 z-10">
            {habits.length === 0 && !isFormOpen ? (
                <EmptyState icon={Flame} title="Тишина" description="Добавь первый ритуал, чтобы запустить пульс" color="orange" actionLabel="Создать" onAction={openNew} />
            ) : (
                <div className="flex flex-col gap-1">
                    {/* Header Row for Dates */}
                    <div className="flex items-center pl-[250px] pr-[100px] mb-2 select-none">
                        <div className="flex justify-between w-full px-4">
                            {dates.map((d, i) => {
                                const isToday = getLocalDateKey(d) === todayStr;
                                return (
                                    <div key={i} className={`w-7 text-center rounded-t-sm ${isToday ? 'bg-gradient-to-t from-indigo-50/50 to-transparent dark:from-indigo-900/10' : ''}`}>
                                        <div className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                                            {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                        </div>
                                        <div className={`text-[9px] font-mono mt-0.5 ${isToday ? 'text-indigo-500 font-bold' : 'text-slate-400'}`}>
                                            {d.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Habit Rows */}
                    {habits.map(habit => {
                        const color = getSphereColor(habit.spheres);
                        const isDoneToday = !!habit.history[todayStr];
                        const progress = isDoneToday ? 100 : 0; 
                        
                        const sparkData = dates.slice(-7).map(d => habit.history[getLocalDateKey(d)] ? 1 : 0);
                        const resonanceOpacity = Math.max(0.1, Math.min(1, 0.2 + (habit.streak * 0.05)));

                        return (
                            <motion.div 
                                key={habit.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group flex items-center bg-white/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all relative overflow-hidden"
                            >
                                {/* Left: Info */}
                                <div 
                                    className="w-[250px] p-4 flex items-center gap-4 shrink-0 cursor-pointer"
                                    onClick={() => setSelectedHabitId(habit.id)}
                                >
                                    <AuraRingButton 
                                        isDone={isDoneToday} 
                                        onClick={(e) => { e.stopPropagation(); handleToggle(habit, new Date()); }} 
                                        color={color}
                                        progress={progress / 100}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug truncate flex items-center gap-2">
                                            {habit.title}
                                            <Diamond size={8} className="text-indigo-400 fill-current" style={{ opacity: resonanceOpacity }} />
                                        </h3>
                                        <p className="text-[10px] font-serif italic text-slate-400 dark:text-slate-500 truncate">{habit.description || 'Ритуал'}</p>
                                    </div>
                                </div>

                                {/* Middle: Matrix */}
                                <div className="flex-1 h-12 overflow-hidden border-l border-r border-slate-100 dark:border-slate-700/50">
                                    <RhythmRow habit={habit} dates={dates} onToggle={(d) => handleToggle(habit, d)} color={color} todayStr={todayStr} />
                                </div>

                                {/* Right: Stats */}
                                <div className="w-[100px] p-3 flex flex-col items-end justify-center shrink-0">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                        {habit.streak > 0 && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                                        <span>{Math.round((Object.keys(habit.history).length / 30) * 100)}%</span>
                                    </div>
                                    <div className="w-16 h-4 mt-1">
                                        <Sparkline data={sparkData} color={color} />
                                    </div>
                                </div>
                                
                                {/* Hover Actions */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-md rounded-lg p-1 flex gap-1">
                                    <button onClick={() => openEdit(habit)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 size={14} /></button>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Metadata Footer */}
                    <div className="mt-8 mb-4 text-center">
                        <div className="inline-block px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest shadow-sm">
                            SYSTEM_STATUS: [ {syncRate > 80 ? 'RHYTHM_STABLE' : syncRate > 40 ? 'SYNCING...' : 'DESYNCHRONIZED'} ] <span className="opacity-30 mx-2">|</span> TOTAL_SYNC: {syncRate}%
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* MODAL FORM */}
        <AnimatePresence>
            {(isFormOpen || selectedHabitId) && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[4px] flex items-center justify-center p-4" onClick={() => { closeForm(); setSelectedHabitId(null); }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 w-full max-w-md relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isFormOpen ? (
                            <>
                                <h3 className="text-xl font-light text-slate-800 dark:text-white mb-6">{editingHabit ? 'Настройка ритма' : 'Новый ритуал'}</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Название</label>
                                        <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" placeholder="Читать 20 страниц..." value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Контекст (Зачем?)</label>
                                        <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-serif italic" placeholder="Развитие когнитивных способностей" value={description} onChange={e => setDescription(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Сфера влияния</label>
                                        <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Частота</label>
                                            <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none" value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                                                <option value="daily">Ежедневно</option>
                                                <option value="times_per_week">В неделю</option>
                                            </select>
                                        </div>
                                        {frequency === 'times_per_week' && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Цель</label>
                                                <input type="number" min="1" max="7" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm outline-none" value={targetCount} onChange={e => setTargetCount(parseInt(e.target.value))} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={closeForm} className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Отмена</button>
                                        <button onClick={handleSave} className="flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-900 dark:bg-indigo-600 text-white rounded-xl shadow-lg hover:opacity-90 transition-opacity">Сохранить</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // DETAIL VIEW
                            (() => {
                                const h = habits.find(habit => habit.id === selectedHabitId);
                                if (!h) return null;
                                return (
                                    <div className="text-center">
                                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-inner`}>
                                            <Flame size={32} className={h.streak > 3 ? "text-orange-500 animate-pulse" : "text-slate-400"} />
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-2">{h.title}</h3>
                                        <p className="text-sm text-slate-500 italic mb-8">{h.description || "Постоянство — ключ к мастерству."}</p>
                                        
                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                <div className="text-2xl font-bold text-indigo-500">{h.streak}</div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400">Стрик</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                <div className="text-2xl font-bold text-emerald-500">{h.bestStreak || 0}</div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400">Рекорд</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                <div className="text-2xl font-bold text-rose-500">{Object.keys(h.history).length}</div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400">Всего</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-4 border-t border-slate-100 dark:border-slate-700/50 pt-6">
                                            <button onClick={() => { setSelectedHabitId(null); openEdit(h); }} className="text-xs font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                                                <Edit2 size={14} /> Изменить
                                            </button>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                                            <button onClick={() => { if(confirm("Удалить?")) { deleteHabit(h.id); setSelectedHabitId(null); } }} className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                                                <Trash2 size={14} /> Удалить
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Rituals;
