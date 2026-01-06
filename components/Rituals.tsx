
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitFrequency } from '../types';
import { Flame, Check, Plus, Trash2, X, Zap, Calendar, Repeat, Bell, GripVertical, CheckCircle2, Circle, Edit2, Clock, Sparkles, Diamond, Activity, MoreHorizontal, TrendingUp, Link2 } from 'lucide-react';
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

// --- KINETIC COMPONENTS ---

interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
}

const Accumulator = ({ 
    activeCount, 
    sphereStats, 
    syncRate,
    isPulsing 
}: { 
    activeCount: number;
    sphereStats: Record<string, number>;
    syncRate: number;
    isPulsing: boolean;
}) => {
    // Calculate widths for the liquid segments
    // We base the width on the TOTAL active habits to show true progress relative to the goal (100% width = 100% sync)
    const totalWidth = activeCount > 0 ? 100 : 0; 
    
    // Order: Productivity, Growth, Relationships
    const prodPercent = activeCount > 0 ? (sphereStats['productivity'] || 0) / activeCount * 100 : 0;
    const growthPercent = activeCount > 0 ? (sphereStats['growth'] || 0) / activeCount * 100 : 0;
    const relPercent = activeCount > 0 ? (sphereStats['relationships'] || 0) / activeCount * 100 : 0;
    const otherPercent = activeCount > 0 ? (sphereStats['default'] || 0) / activeCount * 100 : 0;

    return (
        <div className="relative w-full max-w-2xl mx-auto h-16 mb-8 group perspective-1000">
            {/* Glass Container */}
            <div className={`
                relative w-full h-full rounded-full 
                bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl 
                border border-white/50 dark:border-white/10
                shadow-lg overflow-hidden
                transition-all duration-700
                ${isPulsing ? 'shadow-[0_0_30px_rgba(99,102,241,0.3)] border-indigo-200/50' : ''}
            `}>
                {/* Inner Glow / Atmosphere */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-20 mix-blend-overlay" />
                
                {/* THE LIQUID PLASMA */}
                <div className="absolute inset-0 flex items-center px-1.5 filter blur-[8px] opacity-90 transition-opacity duration-1000">
                    {/* Productivity (Indigo) */}
                    <motion.div 
                        className="h-10 bg-indigo-500 rounded-full mix-blend-screen dark:mix-blend-normal"
                        initial={{ width: 0 }}
                        animate={{ width: `${prodPercent}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    />
                    {/* Growth (Emerald) */}
                    <motion.div 
                        className="h-10 bg-emerald-500 rounded-full mix-blend-screen dark:mix-blend-normal -ml-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${growthPercent}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    />
                    {/* Relationships (Rose) */}
                    <motion.div 
                        className="h-10 bg-rose-500 rounded-full mix-blend-screen dark:mix-blend-normal -ml-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${relPercent}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    />
                    {/* Other (Slate) */}
                    <motion.div 
                        className="h-10 bg-slate-400 dark:bg-slate-600 rounded-full mix-blend-screen dark:mix-blend-normal -ml-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${otherPercent}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    />
                </div>

                {/* Hard Edge Liquid Overlay (For Definition) */}
                <div className="absolute inset-0 flex items-center px-1.5 opacity-30 z-10">
                     <motion.div 
                        className="h-1 bg-white rounded-full shadow-[0_0_10px_white]"
                        animate={{ width: `${syncRate}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                    />
                </div>

                {/* Ripple Effect Target */}
                {isPulsing && (
                    <motion.div 
                        className="absolute inset-0 bg-white/20 z-30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 0.6 }}
                    />
                )}
            </div>

            {/* Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none mix-blend-difference text-white dark:text-slate-200">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                    ACCUMULATOR [ {Math.round(syncRate)}% ]
                </span>
            </div>
        </div>
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
                style={{ backgroundColor: color, boxShadow: isDone ? `0 0 15px ${color}88` : 'none' }}
            />

            {/* Icon */}
            <div className={`relative z-10 transition-all duration-300 ${isDone ? 'text-white scale-100' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 scale-75'}`}>
                {isDone ? <Check size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
            </div>
        </button>
    );
};

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

const RhythmRow = ({ habit, dates, onToggle, color, todayStr }: { habit: Habit, dates: Date[], onToggle: (date: Date) => void, color: string, todayStr: string }) => {
    return (
        <div className="flex items-center justify-between gap-1 h-full px-4 relative">
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
                                    width: isDone ? 6 : 3,
                                    height: isDone ? 6 : 3,
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

// --- MAIN COMPONENT ---

const Rituals: React.FC<Props> = ({ habits, addHabit, updateHabit, deleteHabit }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  
  // Kinetic State
  const [particles, setParticles] = useState<Particle[]>([]);
  const [accumulatorPulse, setAccumulatorPulse] = useState(false);
  const accumulatorRef = useRef<HTMLDivElement>(null);

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
  const activeHabits = habits.filter(h => !h.isArchived);
  const activeHabitsCount = activeHabits.length;
  
  // Calculate specific stats for the Accumulator
  const sphereStats: Record<string, number> = { productivity: 0, growth: 0, relationships: 0, default: 0 };
  let completedTodayCount = 0;

  activeHabits.forEach(h => {
      if (h.history[todayStr]) {
          completedTodayCount++;
          const sphere = h.spheres?.[0] || 'default';
          sphereStats[sphere] = (sphereStats[sphere] || 0) + 1;
      }
  });

  const syncRate = activeHabitsCount > 0 ? (completedTodayCount / activeHabitsCount) * 100 : 0;
  const isFullySynced = syncRate === 100 && activeHabitsCount > 0;

  const spawnParticle = (rect: DOMRect, color: string) => {
      const id = Date.now();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      setParticles(prev => [...prev, { id, x, y, color }]);

      // Particle lifetime and impact logic
      setTimeout(() => {
          // Remove particle
          setParticles(prev => prev.filter(p => p.id !== id));
          // Trigger accumulator pulse
          setAccumulatorPulse(true);
          setTimeout(() => setAccumulatorPulse(false), 300);
      }, 700); // Flight time
  };

  const handleToggle = (habit: Habit, date: Date, e?: React.MouseEvent) => {
      const dStr = getLocalDateKey(date);
      const history = { ...habit.history };
      const currentVal = history[dStr];
      const isToday = dStr === todayStr;

      if (currentVal) {
          delete history[dStr];
      } else {
          history[dStr] = true;
          // Trigger Kinetic Effects only for Today actions
          if (isToday && e) {
              const target = e.currentTarget as HTMLElement;
              const rect = target.getBoundingClientRect();
              const color = getSphereColor(habit.spheres);
              spawnParticle(rect, color);
              
              if (window.confetti) window.confetti({ particleCount: 20, spread: 40, origin: { x: rect.left / window.innerWidth, y: rect.top / window.innerHeight }, colors: [color] }); 
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
          targetCount: frequency === 'times_per_week' ? targetCount : undefined,
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
      setTargetCount(h.targetCount || 3);
      setSelectedSpheres(h.spheres || []);
      setIsFormOpen(true);
  };

  const toggleSphere = (sphereId: string) => {
      if (selectedSpheres.includes(sphereId)) {
          setSelectedSpheres(selectedSpheres.filter(s => s !== sphereId));
      } else {
          setSelectedSpheres([sphereId]); 
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden transition-colors duration-1000">
        
        {/* KINETIC PARTICLES LAYER */}
        <AnimatePresence>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                    animate={{ 
                        y: 80, // Target Accumulator Height (Approx)
                        x: window.innerWidth / 2, // Center horizontally
                        opacity: 0,
                        scale: 0.5 
                    }} 
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                    className="fixed w-3 h-3 rounded-full z-[100] pointer-events-none shadow-[0_0_10px_currentColor]"
                    style={{ backgroundColor: p.color, color: p.color }}
                />
            ))}
        </AnimatePresence>

        {/* Dynamic Background */}
        <div 
            className="absolute inset-0 pointer-events-none transition-all duration-1000" 
            style={{ 
                backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                opacity: isFullySynced ? 0.2 : 0.05,
                color: isFullySynced ? '#10b981' : '#94a3b8'
            }} 
        />
        
        {/* Glow Overlay for 100% Sync */}
        <div className={`absolute inset-0 bg-emerald-500/5 pointer-events-none transition-opacity duration-1000 ${isFullySynced ? 'opacity-100' : 'opacity-0'}`} />

        <header className="p-6 md:p-8 flex justify-between items-end shrink-0 z-10 relative">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Трекер</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Kinetic Reactor v2.0</p>
            </div>
            {!isFormOpen && (
                <button onClick={openNew} className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Plus size={24} />
                </button>
            )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 z-10">
            
            {/* THE ATMOSPHERIC ACCUMULATOR */}
            <div ref={accumulatorRef}>
                <Accumulator 
                    activeCount={activeHabitsCount} 
                    sphereStats={sphereStats} 
                    syncRate={syncRate}
                    isPulsing={accumulatorPulse}
                />
            </div>

            {habits.length === 0 && !isFormOpen ? (
                <EmptyState icon={Flame} title="Тишина" description="Добавь первый ритуал, чтобы запустить реактор" color="orange" actionLabel="Создать" onAction={openNew} />
            ) : (
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                    {/* Header Row for Dates */}
                    <div className="flex items-center pl-[200px] md:pl-[250px] pr-[80px] md:pr-[100px] mb-2 select-none">
                        <div className="flex justify-between w-full px-4">
                            {dates.map((d, i) => {
                                const isToday = getLocalDateKey(d) === todayStr;
                                return (
                                    <div key={i} className={`w-7 text-center rounded-t-sm ${isToday ? 'bg-gradient-to-t from-indigo-50/50 to-transparent dark:from-indigo-900/10' : ''}`}>
                                        <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                                            {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                        </div>
                                        <div className={`text-[8px] font-mono mt-0.5 ${isToday ? 'text-indigo-500 font-bold' : 'text-slate-400'}`}>
                                            {d.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Habit Rows */}
                    {activeHabits.map(habit => {
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
                                className="group flex items-center bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all relative overflow-hidden backdrop-blur-sm"
                            >
                                {/* Left: Info & Trigger */}
                                <div 
                                    className="w-[200px] md:w-[250px] p-3 md:p-4 flex items-center gap-3 md:gap-4 shrink-0 cursor-pointer"
                                    onClick={() => setSelectedHabitId(habit.id)}
                                >
                                    <AuraRingButton 
                                        isDone={isDoneToday} 
                                        onClick={(e) => { e.stopPropagation(); handleToggle(habit, new Date(), e); }} 
                                        color={color}
                                        progress={progress / 100}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-[12px] md:text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug truncate flex items-center gap-2">
                                            {habit.title}
                                            <Diamond size={8} className="text-indigo-400 fill-current" style={{ opacity: resonanceOpacity }} />
                                        </h3>
                                        <p className="text-[10px] font-serif italic text-slate-400 dark:text-slate-500 truncate">{habit.description || 'Ритуал'}</p>
                                    </div>
                                </div>

                                {/* Middle: Matrix */}
                                <div className="flex-1 h-10 md:h-12 overflow-hidden border-l border-r border-slate-100 dark:border-slate-700/50">
                                    <RhythmRow habit={habit} dates={dates} onToggle={(d) => handleToggle(habit, d)} color={color} todayStr={todayStr} />
                                </div>

                                {/* Right: Stats */}
                                <div className="w-[80px] md:w-[100px] p-2 md:p-3 flex flex-col items-end justify-center shrink-0">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                        {habit.streak > 0 && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                                        <span>{Math.round((Object.keys(habit.history).length / 30) * 100)}%</span>
                                    </div>
                                    <div className="w-12 md:w-16 h-4 mt-1">
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
                        <div className={`inline-block px-4 py-2 rounded-lg border font-mono text-[10px] uppercase tracking-widest shadow-sm transition-colors duration-500 ${isFullySynced ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500'}`}>
                            SYSTEM_STATUS: [ {syncRate > 80 ? 'OPTIMAL' : syncRate > 40 ? 'CHARGING' : 'LOW_ENERGY'} ] <span className="opacity-30 mx-2">|</span> SYNC: {Math.round(syncRate)}%
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* CALIBRATION PANEL (MODAL) */}
        <AnimatePresence>
            {(isFormOpen || selectedHabitId) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => { closeForm(); setSelectedHabitId(null); }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-[45px] saturate-150 border border-slate-900/10 dark:border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isFormOpen ? (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                                        {editingHabit ? 'КАЛИБРОВКА' : 'НАСТРОЙКА РИТМА'}
                                    </div>
                                    <button onClick={closeForm} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                        <X size={20} strokeWidth={1} />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* TITLE & DESCRIPTION */}
                                    <div className="space-y-3">
                                        <input 
                                            className="text-xl md:text-2xl font-sans font-light bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none w-full py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
                                            placeholder="Название нового ритма..."
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <input 
                                            className="font-serif italic text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none outline-none w-full placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            placeholder="Зачем тебе этот ритуал? (Контекст)"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>

                                    {/* SPHERES (Aura Rings) */}
                                    <div>
                                        <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-3">Сфера Влияния</div>
                                        <div className="flex gap-4">
                                            {SPHERES.map(s => {
                                                const isSelected = selectedSpheres.includes(s.id);
                                                return (
                                                    <Tooltip key={s.id} content={s.label}>
                                                        <button 
                                                            onClick={() => toggleSphere(s.id)}
                                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? `bg-${s.color}-500 border-${s.color}-500 shadow-[0_0_10px_rgba(0,0,0,0.2)]` : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'}`}
                                                        >
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </button>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* FREQUENCY (Monospace Toggles) */}
                                    <div>
                                        <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-3">Частота</div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setFrequency('daily')}
                                                className={`px-3 py-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-all ${frequency === 'daily' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                                            >
                                                [ DAILY ]
                                            </button>
                                            <button 
                                                onClick={() => setFrequency('times_per_week')}
                                                className={`px-3 py-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-all ${frequency === 'times_per_week' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                                            >
                                                [ WEEKLY ]
                                            </button>
                                        </div>
                                        {frequency === 'times_per_week' && (
                                            <div className="mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                                <span className="text-xs text-slate-500">Цель:</span>
                                                <input 
                                                    type="number" 
                                                    min="1" max="7" 
                                                    className="w-12 bg-transparent border-b border-slate-300 text-center font-mono text-sm outline-none"
                                                    value={targetCount}
                                                    onChange={e => setTargetCount(parseInt(e.target.value))}
                                                />
                                                <span className="text-xs text-slate-500">раз в неделю</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* SKILL LINK (Mock Visual) */}
                                    <div className="pt-2">
                                        <button className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-500 transition-colors group">
                                            <div className="p-1 rounded border border-slate-300 group-hover:border-indigo-400 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                <Diamond size={10} />
                                            </div>
                                            <span>Привязать к Скиллу...</span>
                                        </button>
                                    </div>

                                    {/* PULSE PREVIEW & ACTION */}
                                    <div className="pt-6 mt-4 border-t border-slate-900/5 dark:border-white/5">
                                        {/* Pulse Line Visual */}
                                        <div className="w-full h-8 mb-6 flex items-center justify-center opacity-30">
                                            <svg width="100%" height="100%" viewBox="0 0 300 30" preserveAspectRatio="none">
                                                <path d="M0,15 L100,15 L110,5 L120,25 L130,15 L300,15" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-900 dark:text-white" />
                                            </svg>
                                        </div>

                                        <button 
                                            onClick={handleSave}
                                            className="w-full py-3 rounded-full border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-[0.98]"
                                        >
                                            {editingHabit ? 'ОБНОВИТЬ РИТМ' : 'ИНИЦИИРОВАТЬ РИТМ'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // DETAIL VIEW (Minimalist)
                            (() => {
                                const h = habits.find(habit => habit.id === selectedHabitId);
                                if (!h) return null;
                                return (
                                    <div className="text-center relative">
                                        <button onClick={() => setSelectedHabitId(null)} className="absolute top-0 right-0 text-slate-400 hover:text-slate-600"><X size={20} strokeWidth={1} /></button>
                                        
                                        <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm`}>
                                            <Flame size={24} className={h.streak > 3 ? "text-orange-500 animate-pulse" : "text-slate-400"} strokeWidth={1} />
                                        </div>
                                        
                                        <h3 className="text-2xl font-light text-slate-800 dark:text-white mb-2 tracking-tight">{h.title}</h3>
                                        <p className="text-sm text-slate-500 font-serif italic mb-8">{h.description}</p>
                                        
                                        <div className="flex justify-center gap-8 mb-8">
                                            <div className="text-center">
                                                <div className="text-3xl font-light text-indigo-500">{h.streak}</div>
                                                <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 mt-1">Стрик</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-light text-emerald-500">{Object.keys(h.history).length}</div>
                                                <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 mt-1">Всего</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
                                            <button onClick={() => { setSelectedHabitId(null); openEdit(h); }} className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                                                <Edit2 size={12} /> Изменить
                                            </button>
                                            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                                            <button onClick={() => { if(confirm("Удалить?")) { deleteHabit(h.id); setSelectedHabitId(null); } }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                                                <Trash2 size={12} /> Удалить
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
