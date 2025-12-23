import React, { useMemo, useState, useEffect } from 'react';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { motion } from 'framer-motion';
import { Activity, Flame, Zap, Target, BookOpen, Clock, BrainCircuit, Calendar, ArrowUpRight, TrendingUp, Trophy, Medal, RotateCcw } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  onNavigate: (module: Module) => void;
}

// --- HELPER ---
const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- SVG VISUALIZATION COMPONENTS ---

// 1. Energy Venn Diagram (Updated Spheres: Productivity, Growth, Relationships)
const EnergyVennDiagram = ({ productivity, growth, relationships }: { productivity: number, growth: number, relationships: number }) => {
    // Fixed radius for consistent design match
    const r = 36;
    const strokeWidth = 5;
    
    // Calculate dot positions based on value (0-100 mapping to circle perimeter)
    // SVG Circle starts at 3 o'clock (0 deg).
    // We want start at 6 o'clock (90 deg) and go clockwise.
    const getDotPos = (cx: number, cy: number, radius: number, val: number) => {
        // 90 deg is bottom. 
        const angle = (val / 100) * 360 + 90;
        const rad = angle * (Math.PI / 180);
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad)
        };
    };

    const prodPos = getDotPos(100, 80, r, productivity);
    const growthPos = getDotPos(65, 140, r, growth);
    const relPos = getDotPos(135, 140, r, relationships);

    return (
        <div className="relative w-full h-56 flex items-center justify-center -mt-2">
            <svg viewBox="0 0 200 220" className="w-full h-full max-w-[220px] drop-shadow-sm">
                
                {/* Growth (Bottom Left) - Emerald */}
                <g>
                    {/* Background Circle */}
                    <circle cx="65" cy="140" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    
                    {/* Progress Circle - Rotated 90deg to start at bottom */}
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        cx="65" cy="140" r={r} 
                        fill="none" stroke="#10b981" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        strokeDasharray="1 1"
                        transform="rotate(90 65 140)"
                    />
                    <text x="65" y="140" textAnchor="middle" dy=".3em" fontSize="8" fontWeight="bold" fill="#10b981" className="uppercase tracking-widest pointer-events-none">РОСТ</text>
                    
                    {/* Dot Indicator */}
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
                        cx={growthPos.x} cy={growthPos.y} r="3" fill="white" stroke="#10b981" strokeWidth="2" 
                    />
                </g>

                {/* Relationships (Bottom Right) - Rose/Pink */}
                <g>
                    <circle cx="135" cy="140" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        cx="135" cy="140" r={r} 
                        fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        transform="rotate(90 135 140)"
                    />
                    <text x="135" y="140" textAnchor="middle" dy=".3em" fontSize="8" fontWeight="bold" fill="#f43f5e" className="uppercase tracking-widest pointer-events-none">ЛЮДИ</text>
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }}
                        cx={relPos.x} cy={relPos.y} r="3" fill="white" stroke="#f43f5e" strokeWidth="2" 
                    />
                </g>

                {/* Productivity (Top) - Indigo */}
                <g>
                    <circle cx="100" cy="80" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                        cx="100" cy="80" r={r} 
                        fill="none" stroke="#6366f1" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        transform="rotate(90 100 80)"
                    />
                    <text x="100" y="80" textAnchor="middle" dy=".3em" fontSize="8" fontWeight="bold" fill="#6366f1" className="uppercase tracking-widest pointer-events-none">ДЕЛО</text>
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }}
                        cx={prodPos.x} cy={prodPos.y} r="3" fill="white" stroke="#6366f1" strokeWidth="2" 
                    />
                </g>
            </svg>
        </div>
    );
};

// 2. Smooth Area Chart (Spline) - Enhanced
const SmoothAreaChart = ({ data, color = '#6366f1', height = 100, showAxes = false }: { data: number[], color?: string, height?: number, showAxes?: boolean }) => {
    if (data.length < 2) return null;
    // Fix: Use a minimum max value of 5 to allow the chart to "grow" visually from the bottom
    // instead of always normalizing small values (e.g. 1) to 100% height.
    const max = Math.max(...data, 5);
    
    // Layout config
    const viewBoxWidth = 300;
    const viewBoxHeight = 100;
    const paddingX = 0;
    const paddingY = 5;
    const chartHeight = viewBoxHeight - paddingY * 2;
    
    // Points generation
    const points = data.map((val, i) => {
        const x = paddingX + (i / (data.length - 1)) * (viewBoxWidth - paddingX * 2);
        const y = viewBoxHeight - paddingY - (val / max) * chartHeight;
        return [x, y];
    });

    // Catmull-Rom to Bezier conversion for smooth spline
    const pathData = points.reduce((acc, [x, y], i, arr) => {
        if (i === 0) return `M ${x},${y}`;
        const [prevX, prevY] = arr[i - 1];
        // Control points
        const cp1x = prevX + (x - prevX) / 3;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) * 2 / 3;
        const cp2y = y;
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }, "");

    const fillPath = `${pathData} L ${viewBoxWidth - paddingX},${viewBoxHeight} L ${paddingX},${viewBoxHeight} Z`;

    return (
        <div className="w-full h-full relative flex flex-col">
            {/* Chart Area */}
            <div className="flex-1 relative w-full h-full">
                {showAxes && (
                    <div className="absolute top-0 left-0 text-[9px] text-slate-400 font-mono opacity-70">{max.toFixed(0)}</div>
                )}
                
                <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    {showAxes && (
                        <g className="text-slate-200 dark:text-slate-700/50">
                            <line x1="0" y1={viewBoxHeight} x2={viewBoxWidth} y2={viewBoxHeight} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                            <line x1="0" y1={viewBoxHeight * 0.66} x2={viewBoxWidth} y2={viewBoxHeight * 0.66} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                            <line x1="0" y1={viewBoxHeight * 0.33} x2={viewBoxWidth} y2={viewBoxHeight * 0.33} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                        </g>
                    )}

                    <motion.path 
                        initial={{ d: `M ${paddingX},${viewBoxHeight} L ${viewBoxWidth},${viewBoxHeight} L ${viewBoxWidth},${viewBoxHeight} L ${paddingX},${viewBoxHeight} Z` }}
                        animate={{ d: fillPath }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        fill={`url(#grad-${color.replace('#', '')})`} 
                    />
                    <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            
            {/* X Axis Labels - Updated to match 0-24h range properly */}
            {showAxes && (
                <div className="flex justify-between text-[8px] text-slate-400 mt-2 font-mono uppercase w-full px-1 opacity-70">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:59</span>
                </div>
            )}
        </div>
    );
};

// 3. Simple Bar Chart (Modified for Per-Bar Colors and Opacity)
const BarChart = ({ data, labels, colors, color }: { data: number[], labels: string[], colors?: string[], color?: string }) => {
    const max = Math.max(...data, 1);
    
    return (
        <div className="flex items-end justify-between h-24 gap-2 w-full">
            {data.map((val, i) => {
                const barColor = colors?.[i] || color || 'bg-emerald-400';
                // Dynamic opacity: Min 0.3, Max 1.0 based on value height
                const opacity = 0.3 + (val / max) * 0.7; 
                
                return (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group">
                        <div className="relative w-full flex items-end justify-center h-full">
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${(val / max) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className={`w-full max-w-[20px] rounded-t-sm ${barColor} group-hover:opacity-100 transition-opacity`}
                                style={{ opacity }}
                             />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-2 uppercase font-mono">{labels[i]}</span>
                    </div>
                );
            })}
        </div>
    );
};

// 4. Weekly Habit Rhythm (Heatmap Style)
const WeeklyHabitRhythm = ({ data }: { data: { label: string, percent: number, isToday: boolean }[] }) => {
    return (
        <div className="flex items-end justify-between h-full gap-2 w-full px-2">
            {data.map((day, i) => {
                // Color Logic: Orange (Flame) theme
                const intensity = Math.max(0.1, day.percent / 100);
                const isZero = day.percent === 0;
                
                return (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-2 group cursor-default">
                        <div className="relative w-full flex-1 flex items-end justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${day.percent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05, type: 'spring' }}
                                className={`w-full rounded-t-sm ${isZero ? 'bg-transparent' : 'bg-gradient-to-t from-orange-400 to-amber-300'}`}
                                style={{ opacity: isZero ? 0 : 0.6 + intensity * 0.4 }}
                             />
                             {/* Tooltip on Hover */}
                             <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                                 {Math.round(day.percent)}%
                             </div>
                        </div>
                        <div className="text-center">
                            <span className={`text-[9px] uppercase font-bold tracking-wider ${day.isToday ? 'text-orange-500' : 'text-slate-400'}`}>
                                {day.label}
                            </span>
                            {day.isToday && <div className="w-1 h-1 bg-orange-500 rounded-full mx-auto mt-0.5" />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 5. Radar Chart (Spider Chart)
const RadarChart = ({ data, labels, color = '#6366f1' }: { data: number[], labels: string[], color?: string }) => {
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 30; // padding for labels
    // Fix: Set minimum max to 3 to show growth instead of immediate full shape
    const max = Math.max(...data, 3);
    const count = data.length;
    const angleStep = (Math.PI * 2) / count;

    // Calculate points for the data polygon
    const points = data.map((val, i) => {
        const angle = i * angleStep - Math.PI / 2; // -90deg to start at top
        const r = (val / max) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    // Calculate points for the grid (concentric polygons)
    const gridLevels = [0.25, 0.5, 0.75, 1];
    
    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[180px]">
                {/* Grid */}
                {gridLevels.map((level, idx) => {
                    const gridPoints = Array.from({ length: count }).map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = radius * level;
                        const x = center + r * Math.cos(angle);
                        const y = center + r * Math.sin(angle);
                        return `${x},${y}`;
                    }).join(' ');
                    return (
                        <polygon 
                            key={idx} 
                            points={gridPoints} 
                            fill="none" 
                            stroke="currentColor" 
                            strokeOpacity={0.1}
                            className="text-slate-400 dark:text-slate-500"
                        />
                    );
                })}

                {/* Axes */}
                {Array.from({ length: count }).map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return (
                        <line 
                            key={i} 
                            x1={center} y1={center} x2={x} y2={y} 
                            stroke="currentColor" 
                            strokeOpacity={0.1}
                            className="text-slate-400 dark:text-slate-500"
                        />
                    );
                })}

                {/* Data Polygon */}
                <motion.polygon
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    points={points}
                    fill={color}
                    fillOpacity={0.2}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                />

                {/* Labels */}
                {labels.map((label, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    // Push text slightly further than radius
                    const labelRadius = radius + 15; 
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);
                    return (
                        <text 
                            key={i} 
                            x={x} 
                            y={y} 
                            textAnchor="middle" 
                            dominantBaseline="middle" 
                            fontSize="8" 
                            fontWeight="bold"
                            className="fill-slate-400 dark:fill-slate-500 font-mono"
                        >
                            {label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

// --- DATA PROCESSING HOOKS ---
const useDashboardStats = (notes: Note[], tasks: Task[], habits: Habit[], journal: JournalEntry[], resetTime: number = 0) => {
    return useMemo(() => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayStr = getLocalDateKey(today);
        
        let productivity = 10, growth = 10, relationships = 10;
        
        // Helper to categorize text context (Fallback)
        const checkCategoryFallback = (text: string, defaultCategory: 'productivity' | 'growth' | 'relationships'): 'productivity' | 'growth' | 'relationships' => {
            const t = text.toLowerCase();
            if (t.match(/work|code|job|bussiness|money|finance|project|task|deadline|career|to-do|todo|buy|sell|make|build|работа|код|бизнес|деньги|финансы|проект|задача|карьера|дело|план|цель|купить|продать|сделать|построить|спринт|список|начал|закончил/)) return 'productivity';
            if (t.match(/health|gym|sport|run|sleep|meditate|read|book|learn|skill|art|create|hobby|self|grow|habit|ritual|journal|reflection|здоровье|спорт|бег|сон|медитация|книг|учеба|навык|творчество|хобби|рост|развитие|английский|язык|привычка|ритуал|дневник|мысли|инсайт|трекер|анализ|сегодня|день/)) return 'growth';
            if (t.match(/family|friend|love|date|social|party|meet|people|talk|help|gift|child|kids|wife|husband|mom|dad|parent|colleague|team|семья|друзья|любовь|свидание|общение|встреча|люди|разговор|помощь|дети|жена|муж|мама|папа|родители|коллег|команда/)) return 'relationships';
            return defaultCategory;
        };

        const processSpheres = (spheres: string[] | undefined, fallbackText: string, weight: number, fallbackDefault: 'productivity' | 'growth' | 'relationships') => {
            if (spheres && spheres.length > 0) {
                spheres.forEach(s => {
                    if (s === 'productivity') productivity += weight;
                    if (s === 'growth') growth += weight;
                    if (s === 'relationships') relationships += weight;
                });
            } else {
                const cat = checkCategoryFallback(fallbackText, fallbackDefault);
                if (cat === 'productivity') productivity += weight;
                if (cat === 'growth') growth += weight;
                if (cat === 'relationships') relationships += weight;
            }
        };

        // Scan Habits (History Today or Streak)
        habits.forEach(h => {
            const isDoneToday = h.history[today.toISOString().split('T')[0]];
            const isActiveStreak = h.streak > 2;

            if (isDoneToday || isActiveStreak) {
                processSpheres(h.spheres, h.title, 20, 'growth');
            }
        });

        // Scan Tasks (Sprints) - Created Today or Completed Today or Doing
        tasks.forEach(t => {
            const isRelevant = t.createdAt >= startOfDay || t.column === 'doing' || t.column === 'done';
            if (!isRelevant) return;
            const score = t.column === 'done' ? 15 : 5;
            processSpheres(t.spheres, t.content, score, 'productivity');
        });

        // Scan Journal (Entries Today)
        journal.forEach(j => {
            if (j.date >= startOfDay) {
                processSpheres(j.spheres, j.content, 10, 'growth');
            }
        });

        // Normalize to 0-100 for graph
        const maxScore = Math.max(productivity, growth, relationships, 100);
        const vennData = {
            productivity: (productivity / maxScore) * 100,
            growth: (growth / maxScore) * 100,
            relationships: (relationships / maxScore) * 100
        };

        const totalEnergy = Math.round((vennData.productivity + vennData.growth + vennData.relationships) / 3);
        let energyLabel = "Набираем темп";
        if (totalEnergy > 70) energyLabel = "Поток!";
        if (totalEnergy > 40 && totalEnergy <= 70) energyLabel = "Баланс";

        // 2. Thoughts Sparkline (Last 7 days)
        const notesHistory = [];
        for(let i=6; i>=0; i--) {
             const d = new Date(today);
             d.setDate(d.getDate() - i);
             const start = new Date(d.setHours(0,0,0,0)).getTime();
             const end = new Date(d.setHours(23,59,59,999)).getTime();
             const count = notes.filter(n => n.createdAt >= start && n.createdAt <= end).length;
             notesHistory.push(count);
        }

        // 3. Weekly Habit Rhythm (Current Week Heatmap)
        const getMonday = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        };
        const monday = getMonday(new Date(today));
        const weeklyHabitStats = [];
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dStr = getLocalDateKey(d);
            const dayIndex = d.getDay(); // 0-6

            let potential = 0;
            let completedValue = 0;

            habits.forEach(h => {
                // Check if active for this day
                let applies = false;
                if (h.frequency === 'daily') applies = true;
                else if (h.frequency === 'specific_days') applies = h.targetDays?.includes(dayIndex) ?? false;
                else if (h.frequency === 'times_per_week') applies = true;
                else if (h.frequency === 'times_per_day') applies = true;

                // Don't count if created after this date
                if (h.createdAt > d.getTime() + 86400000) applies = false;

                if (applies) {
                    potential++;
                    const val = h.history[dStr];
                    if (val) {
                        if (typeof val === 'boolean') {
                            completedValue += 1;
                        } else if (typeof val === 'number') {
                            const target = h.targetCount || 1;
                            completedValue += Math.min(1, val / target);
                        }
                    }
                }
            });

            weeklyHabitStats.push({ 
                label: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i], 
                percent: potential > 0 ? (completedValue / potential) * 100 : 0,
                isToday: dStr === todayStr
            });
        }

        // 4. Activity Chronotype (Radar Chart Data)
        // Aggregate activity into 24 hour buckets for Area Chart
        const chronotypeNotes = notes.filter(n => n.createdAt >= resetTime);
        const chronotypeTasks = tasks.filter(t => t.createdAt >= resetTime);

        const hoursDistribution = new Array(24).fill(0);
        chronotypeNotes.forEach(n => hoursDistribution[new Date(n.createdAt).getHours()]++);
        chronotypeTasks.forEach(t => hoursDistribution[new Date(t.createdAt).getHours()]++);

        // Aggregate activity into 8 buckets (3-hour intervals) for Radar Chart
        const buckets = new Array(8).fill(0); // 00-03, 03-06, ...
        
        const addToBucket = (timestamp: number) => {
            const hour = new Date(timestamp).getHours();
            const bucketIndex = Math.floor(hour / 3);
            buckets[bucketIndex]++;
        };

        chronotypeNotes.forEach(n => addToBucket(n.createdAt));
        chronotypeTasks.forEach(t => addToBucket(t.createdAt));
        
        const bucketLabels = ['00', '03', '06', '09', '12', '15', '18', '21'];
        // Ensure at least some value for visualization if empty
        const radarData = buckets.reduce((a, b) => a + b, 0) === 0 ? buckets.map(() => 1) : buckets;

        // 5. Activity by Month (Fake data seeded from real count for demo if empty)
        // In real app, aggregate by month
        const monthlyActivity = [12, 19, 15, 25, 32, 10, 5]; // Placeholder structure
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл'];

        // 6. Balance Bar Chart Data (Use calculated stats)
        // Scale down for bar chart visualization if needed, or use raw scores relative to each other
        const balanceData = [productivity, growth, relationships];

        return { vennData, energyLabel, notesHistory, weeklyHabitStats, radarData, bucketLabels, hoursDistribution, monthlyActivity, monthLabels, balanceData };
    }, [notes, tasks, habits, journal, resetTime]);
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate }) => {
  const [chronotypeResetTime, setChronotypeResetTime] = useState(() => {
      const stored = localStorage.getItem('dashboard_chronotype_reset_time');
      return stored ? parseInt(stored) : 0;
  });

  const { vennData, energyLabel, notesHistory, weeklyHabitStats, radarData, bucketLabels, hoursDistribution, monthlyActivity, monthLabels, balanceData } = useDashboardStats(notes, tasks, habits, journal, chronotypeResetTime);

  // Active Challenges
  const activeChallenges = tasks.filter(t => t.activeChallenge && !t.isChallengeCompleted).slice(0, 3);
  const completedChallengesCount = tasks.filter(t => t.isChallengeCompleted).length;

  const handleResetChronotype = () => {
      if(confirm('Сбросить текущие показания графика активности? Это не удалит данные, только очистит визуализацию.')) {
          const now = Date.now();
          setChronotypeResetTime(now);
          localStorage.setItem('dashboard_chronotype_reset_time', now.toString());
      }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light p-4 md:p-8 bg-[#f8fafc] dark:bg-[#0f172a]">
      
      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto pb-20 auto-rows-min">
        
        {/* 1. ENERGY OF THE DAY (Large Square - Top Left) */}
        <motion.div 
            className="md:col-span-1 md:row-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-between relative overflow-hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="w-full flex items-center gap-2 mb-2">
                <Zap size={16} className="text-slate-400" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Энергия дня</span>
            </div>
            
            <EnergyVennDiagram productivity={vennData.productivity} growth={vennData.growth} relationships={vennData.relationships} />
            
            <div className="text-center mt-2 z-10">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">Энергия дня:</div>
                <div className="text-xl font-light text-slate-500 dark:text-slate-400 mt-1">{energyLabel}!</div>
            </div>
        </motion.div>

        {/* 2. HABIT RHYTHM (Wide - Top Middle) */}
        <motion.div 
            onClick={() => onNavigate(Module.RITUALS)}
            className="md:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col cursor-pointer group"
            whileHover={{ y: -2 }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Ритм привычек (Неделя)</span>
                </div>
            </div>
            <div className="flex-1 w-full h-32 flex items-center justify-center">
                <WeeklyHabitRhythm data={weeklyHabitStats} />
            </div>
        </motion.div>

        {/* 3. THOUGHTS (Small Square - Top Right) */}
        <motion.div 
            onClick={() => onNavigate(Module.NAPKINS)}
            className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer group"
            whileHover={{ y: -2 }}
        >
             <div className="flex items-center gap-2">
                 <BrainCircuit size={16} className="text-indigo-500" />
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Мысли</span>
             </div>
             <div className="mt-2">
                 <div className="text-4xl font-bold text-slate-900 dark:text-white">{notes.length}</div>
                 <div className="text-[10px] text-slate-400 mt-1">за 7 дней</div>
             </div>
             <div className="h-16 mt-4">
                 <SmoothAreaChart data={notesHistory} color="#818cf8" />
             </div>
        </motion.div>

        {/* 4. CHRONOTYPE ACTIVITY (Split Card: Area + Radar) */}
        <motion.div className="md:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Хронотип активности</span>
                </div>
                <Tooltip content="Сбросить показания">
                    <button 
                        onClick={handleResetChronotype} 
                        className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <RotateCcw size={14} />
                    </button>
                </Tooltip>
            </div>
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
                {/* Left: Area Chart (Hourly Flow) */}
                <div className="flex-1 w-full h-40 relative">
                     <SmoothAreaChart data={hoursDistribution} color="#94a3b8" height={100} showAxes={true} />
                </div>

                {/* Right: Radar Chart (Peak Focus) */}
                <div className="flex-1 w-full h-48 flex flex-col items-center justify-center relative">
                    <RadarChart data={radarData} labels={bucketLabels} color="#6366f1" />
                    <div className="text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Пик продуктивности</div>
                </div>
            </div>
        </motion.div>

        {/* 5. CHALLENGES (Tall Dark Card - Right) */}
        <motion.div 
            onClick={() => onNavigate(Module.KANBAN)}
            className="md:col-span-1 md:row-span-2 bg-slate-700 dark:bg-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col relative overflow-hidden cursor-pointer group border border-slate-600 dark:border-slate-700"
        >
             <div className="flex items-center gap-2 mb-6">
                 <Target size={16} className="text-emerald-400" />
                 <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Вызовы</span>
             </div>
             
             <div className="flex-1 space-y-4 min-h-0">
                {activeChallenges.length > 0 ? (
                    activeChallenges.map(t => (
                        <div key={t.id} className="bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
                            <div className="text-sm font-medium leading-snug mb-3 line-clamp-2">{t.content}</div>
                            {/* Gradient Progress Bar */}
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 w-2/3 rounded-full" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center opacity-40 py-10 flex flex-col items-center">
                        <Medal size={40} className="mb-2" />
                        <div className="text-xs">Нет активных вызовов</div>
                    </div>
                )}
             </div>
             
             <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-slate-300 uppercase tracking-widest">Зал славы</span>
                     <span className="text-2xl font-bold">{completedChallengesCount}</span>
                 </div>
                 <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center text-[8px]">🏆</div>)}
                 </div>
             </div>
        </motion.div>

        {/* 6. BALANCE (Bar Chart - Bottom Left) */}
        <motion.div className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                 <Target size={16} className="text-slate-400" />
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Баланс сфер</span>
             </div>
             <div className="flex-1 flex items-end">
                 <BarChart 
                    data={balanceData} 
                    labels={['Дело', 'Рост', 'Люди']} 
                    colors={['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500']} 
                 />
             </div>
        </motion.div>

        {/* 7. INSIGHTS (Purple Card - Bottom Middle) */}
        <motion.div 
            onClick={() => onNavigate(Module.JOURNAL)}
            className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
             
             <div className="flex items-center gap-2 relative z-10">
                 <BookOpen size={16} className="text-indigo-200" />
                 <span className="text-xs font-bold uppercase text-indigo-200 tracking-wider">Инсайты</span>
             </div>
             
             <div className="relative z-10">
                 <div className="text-5xl font-bold mb-1">{journal.length}</div>
                 <div className="text-sm font-medium text-indigo-100">Записей в дневнике</div>
                 <div className="text-[10px] text-indigo-300 mt-1 opacity-80">Перейти к рефлексии</div>
             </div>
        </motion.div>

        {/* 8. ACTIVITY BY MONTH (Bottom Right) */}
        <motion.div className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                 <Calendar size={16} className="text-slate-400" />
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Активность по месяцам</span>
             </div>
             <div className="flex-1 flex items-end">
                 <BarChart data={monthlyActivity} labels={monthLabels} color="bg-indigo-400" />
             </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;