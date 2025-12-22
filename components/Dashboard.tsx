import React, { useMemo } from 'react';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { motion } from 'framer-motion';
import { Activity, Flame, Zap, Target, BookOpen, Clock, BrainCircuit, Calendar, ArrowUpRight, TrendingUp } from 'lucide-react';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  onNavigate: (module: Module) => void;
}

// --- VISUALIZATION COMPONENTS ---

const ActivityRing = ({ percent, size = 120, stroke = 8, color = 'text-indigo-500', label, subLabel }: { percent: number, size?: number, stroke?: number, color?: string, label: string, subLabel?: string }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <motion.circle 
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx={size/2} cy={size/2} r={radius} 
                    stroke="currentColor" strokeWidth={stroke} fill="transparent" 
                    strokeDasharray={circumference} strokeLinecap="round" 
                    className={color} 
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{Math.round(percent)}%</span>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{label}</span>
                {subLabel && <span className="text-[9px] text-slate-400 mt-0.5">{subLabel}</span>}
            </div>
        </div>
    );
};

const Sparkline = ({ data, color = '#6366f1' }: { data: number[], color?: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 40;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10 overflow-visible">
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                d={`M ${points}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            <circle cx={(data.length - 1) * (width/(data.length-1))} cy={height - ((data[data.length-1] - min) / range) * height} r="3" fill={color} />
        </svg>
    );
};

const Heatmap = ({ data }: { data: Record<string, number> }) => {
    // Generate last 56 days (8 weeks)
    const days = useMemo(() => {
        const res = [];
        const today = new Date();
        for (let i = 55; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            res.push({ date: d, count: data[key] || 0 });
        }
        return res;
    }, [data]);

    const getColor = (count: number) => {
        if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
        if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900';
        if (count <= 4) return 'bg-emerald-300 dark:bg-emerald-700';
        if (count <= 6) return 'bg-emerald-400 dark:bg-emerald-600';
        return 'bg-emerald-500 dark:bg-emerald-500';
    };

    return (
        <div className="grid grid-cols-[repeat(14,1fr)] gap-1">
            {days.map((d, i) => (
                <div key={i} title={`${d.date.toLocaleDateString()}: ${d.count}`} className={`w-full aspect-square rounded-sm ${getColor(d.count)}`} />
            ))}
        </div>
    );
};

// --- DATA PROCESSING HOOKS ---
const useDashboardStats = (notes: Note[], tasks: Task[], habits: Habit[]) => {
    return useMemo(() => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        
        // 1. Productivity Score (0-100)
        // Logic: Tasks Done + Habit Streak impact + Notes captured
        const activeTasks = tasks.filter(t => !t.isArchived);
        const doneTasks = activeTasks.filter(t => t.column === 'done').length;
        const totalActiveTasks = activeTasks.length || 1;
        const taskScore = (doneTasks / totalActiveTasks) * 50;
        
        const activeHabits = habits.length || 1;
        const habitsDoneToday = habits.filter(h => {
             const key = today.toISOString().split('T')[0];
             return h.history[key]; 
        }).length;
        const habitScore = (habitsDoneToday / activeHabits) * 30;
        
        const notesToday = notes.filter(n => n.createdAt >= startOfDay).length;
        const noteScore = Math.min(notesToday * 5, 20); // Cap at 20 pts

        const dailyScore = Math.min(100, taskScore + habitScore + noteScore);

        // 2. Sparkline Data (Notes count over last 7 days)
        const notesHistory = [];
        for(let i=6; i>=0; i--) {
             const d = new Date(today);
             d.setDate(d.getDate() - i);
             const start = new Date(d.setHours(0,0,0,0)).getTime();
             const end = new Date(d.setHours(23,59,59,999)).getTime();
             const count = notes.filter(n => n.createdAt >= start && n.createdAt <= end).length;
             notesHistory.push(count);
        }

        // 3. Heatmap Data (Habits + Tasks completions aggregated)
        const activityHeatmap: Record<string, number> = {};
        tasks.filter(t => t.column === 'done').forEach(() => {
            // Task objects don't store completedAt date in current type definition, 
            // assuming 'createdAt' for archived/done or just mocking distribution for demo logic
            // In a real app, I'd update Task type to include `completedAt`.
            // FALLBACK: Use Journal Entries count for heatmap as proxy for "Deep Work"
        });
        
        // Using Habits for Heatmap accuracy as they are date-keyed
        habits.forEach(h => {
            Object.keys(h.history).forEach(dateStr => {
                activityHeatmap[dateStr] = (activityHeatmap[dateStr] || 0) + 1;
            });
        });

        // 4. Focus Radar Data (Category approximation from Tags)
        const tagCounts: Record<string, number> = { work: 0, health: 0, learn: 0, soul: 0 };
        const mapTag = (t: string) => {
            const l = t.toLowerCase();
            if (l.includes('work') || l.includes('dev') || l.includes('biz')) return 'work';
            if (l.includes('gym') || l.includes('food') || l.includes('sleep')) return 'health';
            if (l.includes('book') || l.includes('study') || l.includes('ai')) return 'learn';
            return 'soul';
        };
        [...notes, ...tasks].forEach(item => {
            const tags = 'tags' in item ? item.tags : [];
            if (tags.length === 0) tagCounts['soul'] += 0.5; // Default bucket
            tags.forEach(t => {
                const cat = mapTag(t);
                tagCounts[cat] += 1;
            });
        });
        // Normalize for Radar (max 100)
        const maxTag = Math.max(...Object.values(tagCounts), 1);
        const radarData = [
            { label: 'Work', value: (tagCounts.work / maxTag) * 100 },
            { label: 'Health', value: (tagCounts.health / maxTag) * 100 },
            { label: 'Learn', value: (tagCounts.learn / maxTag) * 100 },
            { label: 'Soul', value: (tagCounts.soul / maxTag) * 100 },
        ];

        // 5. Activity by Hour (Histogram)
        // Since we lack `completedAt`, we use `createdAt` of Notes as proxy for "Brain Activity"
        const hoursDistribution = new Array(24).fill(0);
        notes.forEach(n => {
            const h = new Date(n.createdAt).getHours();
            hoursDistribution[h]++;
        });
        const maxHour = Math.max(...hoursDistribution, 1);
        const hourData = hoursDistribution.map(val => (val / maxHour) * 100);

        return { dailyScore, notesHistory, activityHeatmap, radarData, hourData };
    }, [notes, tasks, habits]);
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate }) => {
  const { dailyScore, notesHistory, activityHeatmap, radarData, hourData } = useDashboardStats(notes, tasks, habits);

  // Active Challenges
  const activeChallenges = tasks.filter(t => t.activeChallenge && !t.isChallengeCompleted);
  const completedChallengesCount = tasks.filter(t => t.isChallengeCompleted).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light p-4 md:p-8 bg-[#f8fafc] dark:bg-[#0f172a]">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Обзор</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Зеркало твоей продуктивности</p>
        </div>
        <div className="text-right hidden md:block">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('ru-RU', { weekday: 'long' })}</div>
            <div className="text-sm text-slate-400">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto pb-20">
        
        {/* CARD 1: HERO (Daily Score) - Large Square */}
        <motion.div 
            className="md:col-span-1 md:row-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="absolute top-4 left-4 text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><Zap size={14} /> Энергия дня</div>
            <ActivityRing percent={dailyScore} size={160} stroke={12} label="Score" subLabel="Daily Index" />
            <div className="mt-6 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {dailyScore > 80 ? "Ты в потоке! 🔥" : dailyScore > 50 ? "Хороший темп" : "Разгоняемся..."}
                </p>
            </div>
            {/* Background Decoration */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
        </motion.div>

        {/* CARD 2: HABITS HEATMAP - Wide Rect */}
        <motion.div 
            onClick={() => onNavigate(Module.RITUALS)}
            className="md:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden cursor-pointer group"
            whileHover={{ y: -2 }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><Flame size={14} className="text-orange-500" /> Ритм привычек</div>
                <ArrowUpRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="w-full">
                <Heatmap data={activityHeatmap} />
            </div>
        </motion.div>

        {/* CARD 3: NOTES SPARKLINE - Small Square */}
        <motion.div 
            onClick={() => onNavigate(Module.NAPKINS)}
            className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer group"
            whileHover={{ y: -2 }}
        >
             <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><BrainCircuit size={14} className="text-indigo-500" /> Мысли</div>
             <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 my-2">{notes.length}</div>
             <Sparkline data={notesHistory} color="#6366f1" />
             <div className="text-[10px] text-slate-400 text-right mt-1">за 7 дней</div>
        </motion.div>

        {/* CARD 4: TIME ANALYTICS (Histogram) - Wide Rect */}
        <motion.div className="md:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1 mb-4"><Clock size={14} /> Хронотип активности</div>
            <div className="flex items-end justify-between h-24 gap-1">
                {hourData.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group/bar relative">
                        <div 
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-sm hover:bg-indigo-400 transition-colors relative" 
                            style={{ height: `${Math.max(h, 5)}%` }} 
                        >
                             {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity z-10">
                                {i}:00
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-2 uppercase font-mono">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
            </div>
        </motion.div>

        {/* CARD 5: CHALLENGES LIST - Vertical Tall */}
        <motion.div 
            onClick={() => onNavigate(Module.KANBAN)}
            className="md:col-span-1 md:row-span-2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#1e293b] dark:to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col relative overflow-hidden cursor-pointer"
        >
             <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1 mb-6"><Target size={14} className="text-emerald-400" /> Вызовы</div>
             
             <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar-light min-h-0">
                {activeChallenges.length > 0 ? (
                    activeChallenges.map(t => (
                        <div key={t.id} className="bg-white/10 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                            <div className="text-xs font-medium line-clamp-2 leading-relaxed mb-2">{t.content}</div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 w-1/2 animate-pulse" /> {/* Mock progress for simplicity */}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center opacity-50 py-10">
                        <Target size={32} className="mx-auto mb-2 opacity-50" />
                        <div className="text-xs">Нет активных челленджей</div>
                    </div>
                )}
             </div>
             
             <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                 <span className="text-xs text-slate-400">Зал славы</span>
                 <span className="text-xl font-bold">{completedChallengesCount}</span>
             </div>
        </motion.div>

        {/* CARD 6: RADAR CHART (Focus Areas) - Square */}
        <motion.div className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center relative">
             <div className="absolute top-6 left-6 text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><Target size={14} /> Баланс</div>
             
             {/* Simple SVG Radar Chart Implementation */}
             <svg width="140" height="140" viewBox="0 0 100 100" className="mt-4">
                 <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-slate-700" />
                 <polygon points="50,30 70,50 50,70 30,50" fill="none" stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-slate-700" />
                 <line x1="50" y1="10" x2="50" y2="90" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                 <line x1="10" y1="50" x2="90" y2="50" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                 
                 {/* Data Polygon */}
                 <polygon 
                    points={`
                        50,${50 - (radarData[0].value/100)*40} 
                        ${50 + (radarData[1].value/100)*40},50 
                        50,${50 + (radarData[2].value/100)*40} 
                        ${50 - (radarData[3].value/100)*40},50
                    `}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeLinejoin="round"
                 />
                 {/* Labels */}
                 <text x="50" y="8" fontSize="6" textAnchor="middle" className="fill-slate-400 uppercase font-bold">Work</text>
                 <text x="96" y="52" fontSize="6" textAnchor="middle" className="fill-slate-400 uppercase font-bold">Health</text>
                 <text x="50" y="98" fontSize="6" textAnchor="middle" className="fill-slate-400 uppercase font-bold">Learn</text>
                 <text x="4" y="52" fontSize="6" textAnchor="middle" className="fill-slate-400 uppercase font-bold">Soul</text>
             </svg>
        </motion.div>

        {/* CARD 7: JOURNAL SUMMARY - Small Square */}
        <motion.div 
            onClick={() => onNavigate(Module.JOURNAL)}
            className="md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between cursor-pointer group"
        >
             <div className="text-xs font-bold uppercase text-indigo-200 flex items-center gap-1"><BookOpen size={14} /> Инсайты</div>
             <div className="text-4xl font-bold">{journal.length}</div>
             <div className="text-xs text-indigo-100 opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                 Перейти к дневнику <ArrowUpRight size={12} />
             </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;