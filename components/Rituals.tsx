
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitFrequency } from '../types';
import { Flame, Check, Plus, Trash2, X, Zap, Edit2, Diamond } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES } from '../constants';

interface Props {
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
}

// --- CONSTANTS ---

const NEON_COLORS: Record<string, string> = {
    productivity: '#6366f1', // Indigo
    growth: '#10b981',       // Emerald
    relationships: '#f43f5e', // Rose
    default: '#94a3b8'       // Slate
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

// --- SUB-COMPONENTS ---

// 1. The Atmospheric Accumulator
const Accumulator = ({ 
    counts, 
    total, 
    completed,
    pulse 
}: { 
    counts: Record<string, number>, 
    total: number, 
    completed: number,
    pulse: boolean
}) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const sphereKeys = ['productivity', 'growth', 'relationships', 'default'];

    return (
        <div className="w-full max-w-3xl mx-auto mb-8 relative z-20 px-4">
            {/* The Capsule */}
            <motion.div 
                animate={pulse ? { scale: [1, 1.02, 1], filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] } : {}}
                transition={{ duration: 0.3 }}
                className="h-20 rounded-[2.5rem] bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-[30px] border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative overflow-hidden flex items-center p-1.5"
            >
                {/* Liquid Container */}
                <div className="w-full h-full rounded-[2rem] bg-slate-100/50 dark:bg-black/30 overflow-hidden relative">
                    {/* The Fluid */}
                    <motion.div 
                        className="h-full flex relative z-10"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    >
                        {sphereKeys.map(key => {
                            const count = counts[key] || 0;
                            if (count === 0 && completed > 0) return null;
                            const share = completed > 0 ? (count / completed) * 100 : 0;
                            
                            return (
                                <motion.div
                                    key={key}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: `${share}%`, opacity: 1 }}
                                    className="h-full relative"
                                    style={{ backgroundColor: NEON_COLORS[key] }}
                                >
                                    {/* Plasma Turbulence */}
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9InB1cnBsZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSI+PHBhdGggZD0iTTAgMGwyMCAyME0yMCAwbC0yMCAyMCIvPjwvc3ZnPg==')] opacity-20 mix-blend-overlay" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                                </motion.div>
                            );
                        })}
                        
                        {/* Leading Edge Glow */}
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[4px] z-20" />
                    </motion.div>

                    {/* Empty State Ghost Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-300 dark:text-slate-700">
                            {percentage === 0 ? 'ACCUMULATOR_EMPTY' : ''}
                        </span>
                    </div>
                </div>

                {/* Glass Gloss */}
                <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/40 dark:ring-white/5 pointer-events-none z-30" />
                <div className="absolute top-2 left-6 right-6 h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none z-30" />

                {/* Data HUD */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40 text-right pointer-events-none mix-blend-difference text-white/80 hidden md:block">
                    <div className="font-mono text-2xl font-bold leading-none">{Math.round(percentage)}%</div>
                    <div className="font-mono text-[8px] uppercase tracking-wider opacity-70">Power Level</div>
                </div>
            </motion.div>
        </div>
    );
};

// 2. Rhythm Row (Simplified for focus on particles)
const RhythmRow = ({ habit, dates, onToggle, color, todayStr }: { habit: Habit, dates: Date[], onToggle: (e: React.MouseEvent, date: Date) => void, color: string, todayStr: string }) => {
    return (
        <div className="flex items-center justify-between gap-1 h-full px-4 relative">
            {dates.map(date => {
                const dateKey = getLocalDateKey(date);
                const isDone = !!habit.history[dateKey];
                const isToday = dateKey === todayStr;
                
                return (
                    <div key={dateKey} className={`w-7 h-full flex items-center justify-center relative z-10 ${isToday ? 'bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent dark:via-indigo-900/10' : ''}`}>
                        <button 
                            onClick={(e) => onToggle(e, date)}
                            className="group relative w-full h-8 flex items-center justify-center outline-none"
                        >
                            <motion.div 
                                initial={false}
                                animate={{ 
                                    scale: isDone ? 1 : 0.4,
                                    backgroundColor: isDone ? color : '#94a3b8', 
                                    opacity: isDone ? 1 : 0.2
                                }}
                                className={`rounded-full shadow-sm ${isToday && !isDone ? 'ring-1 ring-slate-300 dark:ring-slate-600' : ''}`}
                                style={{ 
                                    width: isDone ? 6 : 4,
                                    height: isDone ? 6 : 4,
                                    boxShadow: isDone ? `0 0 8px ${color}` : 'none' 
                                }}
                            />
                        </button>
                    </div>
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
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [accumulatorPulse, setAccumulatorPulse] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [description, setDescription] = useState(''); 
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetCount, setTargetCount] = useState<number>(1);
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);

  const today = new Date();
  const todayStr = getLocalDateKey(today);

  // Date Range (Last 14 days)
  const dates = useMemo(() => {
      const arr = [];
      for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          arr.push(d);
      }
      return arr;
  }, []);

  // Stats for Accumulator
  const stats = useMemo(() => {
      const s: Record<string, number> = { productivity: 0, growth: 0, relationships: 0, default: 0 };
      let completed = 0;
      let total = 0;
      
      habits.filter(h => !h.isArchived).forEach(h => {
          total++;
          if (h.history[todayStr]) {
              completed++;
              const sphere = h.spheres?.[0] || 'default';
              if (s[sphere] !== undefined) s[sphere]++;
              else s['default']++;
          }
      });
      return { counts: s, total, completed };
  }, [habits, todayStr]);

  // Particle Logic
  const spawnParticle = (x: number, y: number, color: string) => {
      const id = Date.now();
      setParticles(prev => [...prev, { id, x, y, color }]);
      
      // Cleanup happens via animation onComplete, but fail-safe here
      setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== id));
      }, 1000);
  };

  const handleParticleArrival = (id: number) => {
      setParticles(prev => prev.filter(p => p.id !== id));
      setAccumulatorPulse(true);
      setTimeout(() => setAccumulatorPulse(false), 300);
  };

  const handleToggle = (e: React.MouseEvent, habit: Habit, date: Date) => {
      e.stopPropagation();
      const dStr = getLocalDateKey(date);
      const history = { ...habit.history };
      const currentVal = history[dStr];
      const color = getSphereColor(habit.spheres);

      if (currentVal) {
          delete history[dStr];
      } else {
          history[dStr] = true;
          // Spawn particle only if toggling ON
          spawnParticle(e.clientX, e.clientY, color);
      }
      updateHabit({ ...habit, history });
  };

  // Form Handlers
  const handleSave = () => {
      if (!newTitle.trim()) return;
      const baseHabit = {
          title: newTitle, description, frequency, targetCount: frequency === 'times_per_week' ? targetCount : undefined, spheres: selectedSpheres, color: 'indigo', icon: 'Zap'
      };
      if (editingHabit) updateHabit({ ...editingHabit, ...baseHabit });
      else addHabit({ id: Date.now().toString(), createdAt: Date.now(), history: {}, streak: 0, bestStreak: 0, reminders: [], ...baseHabit });
      closeForm();
  };

  const closeForm = () => { setIsFormOpen(false); setEditingHabit(null); setNewTitle(''); setDescription(''); setFrequency('daily'); setSelectedSpheres([]); };
  const openNew = () => { closeForm(); setIsFormOpen(true); };
  const openEdit = (h: Habit) => { setEditingHabit(h); setNewTitle(h.title); setDescription(h.description || ''); setFrequency(h.frequency); setTargetCount(h.targetCount || 3); setSelectedSpheres(h.spheres || []); setIsFormOpen(true); };
  const toggleSphere = (id: string) => { if (selectedSpheres.includes(id)) setSelectedSpheres([]); else setSelectedSpheres([id]); };

  const isFullSync = stats.percentage === 100;

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        {/* Kinetic Particles Layer */}
        {particles.map(p => (
            <motion.div
                key={p.id}
                initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                animate={{ 
                    x: window.innerWidth / 2, // Approximate center
                    y: 80, // Approximate header position
                    scale: 0.5, 
                    opacity: 0.5 
                }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                onAnimationComplete={() => handleParticleArrival(p.id)}
                className="fixed w-3 h-3 rounded-full pointer-events-none z-[100]"
                style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
            />
        ))}

        {/* Dynamic Background */}
        <div 
            className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isFullSync ? 'opacity-30' : 'opacity-10'}`} 
            style={{ 
                backgroundImage: 'radial-gradient(var(--dot-color) 1px, transparent 1px)', 
                backgroundSize: '24px 24px',
                // @ts-ignore
                '--dot-color': isFullSync ? '#6366f1' : '#94a3b8'
            }} 
        />
        {isFullSync && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none" />}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light relative z-10 pt-8 pb-20">
            
            {/* Header Area */}
            <Accumulator 
                counts={stats.counts} 
                total={stats.total} 
                completed={stats.completed} 
                pulse={accumulatorPulse}
            />

            {/* Controls */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Протоколы</h1>
                    <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">Daily Routine</p>
                </div>
                <button onClick={openNew} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Plus size={20} strokeWidth={2} />
                </button>
            </div>

            {/* List */}
            {habits.length === 0 ? (
                <EmptyState icon={Flame} title="Система не активна" description="Добавь первый ритуал, чтобы запустить реактор" color="indigo" actionLabel="Создать" onAction={openNew} />
            ) : (
                <div className="flex flex-col gap-2 max-w-[1920px] mx-auto px-4 md:px-8">
                    {/* Date Header */}
                    <div className="flex pl-[200px] md:pl-[300px] mb-2 pr-4">
                        <div className="flex justify-between w-full">
                            {dates.map((d, i) => (
                                <div key={i} className="w-7 text-center">
                                    <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                                    <div className={`text-[8px] font-mono ${getLocalDateKey(d) === todayStr ? 'text-indigo-500' : 'text-slate-400'}`}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {habits.map(habit => {
                        const color = getSphereColor(habit.spheres);
                        return (
                            <motion.div 
                                key={habit.id}
                                layout
                                className="group flex items-center bg-white/40 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all relative overflow-hidden h-14"
                            >
                                {/* Info */}
                                <div 
                                    className="w-[200px] md:w-[300px] px-4 flex items-center gap-3 shrink-0 cursor-pointer h-full border-r border-slate-100 dark:border-slate-700/50"
                                    onClick={() => setSelectedHabitId(habit.id)}
                                >
                                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{habit.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{habit.streak} DAY STREAK</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rhythm Grid */}
                                <div className="flex-1 h-full">
                                    <RhythmRow habit={habit} dates={dates} onToggle={(e, d) => handleToggle(e, habit, d)} color={color} todayStr={todayStr} />
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-md rounded-lg p-1">
                                    <button onClick={() => openEdit(habit)} className="p-1.5 text-slate-400 hover:text-indigo-500"><Edit2 size={14} /></button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* FORM MODAL */}
        <AnimatePresence>
            {(isFormOpen || selectedHabitId) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => { closeForm(); setSelectedHabitId(null); }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isFormOpen ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{editingHabit ? 'Настройка' : 'Новый ритуал'}</h3>
                                    <button onClick={closeForm}><X size={20} className="text-slate-400" /></button>
                                </div>
                                <div className="space-y-6">
                                    <input className="text-2xl font-light w-full bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none py-2" placeholder="Название..." value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
                                    <input className="text-sm w-full bg-transparent outline-none text-slate-500" placeholder="Зачем это нужно?" value={description} onChange={e => setDescription(e.target.value)} />
                                    
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Сфера</div>
                                        <div className="flex gap-2">
                                            {SPHERES.map(s => (
                                                <button key={s.id} onClick={() => toggleSphere(s.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedSpheres.includes(s.id) ? `bg-${s.color}-500 border-${s.color}-500 text-white` : 'border-slate-200'}`}>
                                                    {selectedSpheres.includes(s.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={handleSave} className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider">Сохранить</button>
                                </div>
                            </>
                        ) : (
                            // Detail View
                            <div className="text-center relative">
                                <button onClick={() => setSelectedHabitId(null)} className="absolute top-0 right-0"><X size={20} className="text-slate-400"/></button>
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center"><Flame size={24} className="text-slate-400"/></div>
                                <h3 className="text-2xl font-light mb-2">{habits.find(h => h.id === selectedHabitId)?.title}</h3>
                                <div className="flex justify-center gap-4 mt-6">
                                    <button onClick={() => { openEdit(habits.find(h => h.id === selectedHabitId)!); setSelectedHabitId(null); }} className="text-xs font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-wider flex items-center gap-2"><Edit2 size={12}/> Редактировать</button>
                                    <button onClick={() => { if(confirm("Удалить?")) { deleteHabit(selectedHabitId!); setSelectedHabitId(null); } }} className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-2"><Trash2 size={12}/> Удалить</button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Rituals;
