
import React, { useMemo, useState, useEffect } from 'react';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { motion } from 'framer-motion';
import { Activity, Flame, Zap, Target, BookOpen, Clock, BrainCircuit, Calendar, ArrowUpRight, TrendingUp, Trophy, Medal, RotateCcw, Lightbulb } from 'lucide-react';
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

// 1. Energy Venn Diagram
const EnergyVennDiagram = ({ productivity, growth, relationships }: { productivity: number, growth: number, relationships: number }) => {
    const r = 36;
    const strokeWidth = 5;
    
    // Normalize for Venn (scale 0-100 visually, even if score > 100)
    const normProd = Math.min(100, productivity);
    const normGrowth = Math.min(100, growth);
    const normRel = Math.min(100, relationships);

    const getDotPos = (cx: number, cy: number, radius: number, val: number) => {
        const angle = (val / 100) * 360 + 90;
        const rad = angle * (Math.PI / 180);
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad)
        };
    };

    const prodPos = getDotPos(100, 80, r, normProd);
    const growthPos = getDotPos(65, 140, r, normGrowth);
    const relPos = getDotPos(135, 140, r, normRel);

    return (
        <div className="relative w-full h-56 flex items-center justify-center -mt-2">
            <svg viewBox="0 0 200 220" className="w-full h-full max-w-[220px] drop-shadow-sm">
                <g>
                    <circle cx="65" cy="140" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: normGrowth / 100, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        cx="65" cy="140" r={r} 
                        fill="none" stroke="#10b981" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        strokeDasharray="1 1"
                        transform="rotate(90 65 140)"
                    />
                    <text x="65" y="140" textAnchor="middle" dy=".3em" fontSize="10" fontWeight="bold" fill="#10b981" className="uppercase tracking-widest pointer-events-none">РОСТ</text>
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
                        cx={growthPos.x} cy={growthPos.y} r="3" fill="white" stroke="#10b981" strokeWidth="2" 
                    />
                </g>
                <g>
                    <circle cx="135" cy="140" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: normRel / 100, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        cx="135" cy="140" r={r} 
                        fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        transform="rotate(90 135 140)"
                    />
                    <text x="135" y="140" textAnchor="middle" dy=".3em" fontSize="10" fontWeight="bold" fill="#f43f5e" className="uppercase tracking-widest pointer-events-none">ЛЮДИ</text>
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }}
                        cx={relPos.x} cy={relPos.y} r="3" fill="white" stroke="#f43f5e" strokeWidth="2" 
                    />
                </g>
                <g>
                    <circle cx="100" cy="80" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-700" />
                    <motion.circle 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: normProd / 100, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                        cx="100" cy="80" r={r} 
                        fill="none" stroke="#6366f1" strokeWidth={strokeWidth} 
                        className="opacity-90"
                        transform="rotate(90 100 80)"
                    />
                    <text x="100" y="80" textAnchor="middle" dy=".3em" fontSize="10" fontWeight="bold" fill="#6366f1" className="uppercase tracking-widest pointer-events-none">ДЕЛО</text>
                    <motion.circle 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }}
                        cx={prodPos.x} cy={prodPos.y} r="3" fill="white" stroke="#6366f1" strokeWidth="2" 
                    />
                </g>
            </svg>
        </div>
    );
};

// 2. Smooth Area Chart
const SmoothAreaChart = ({ data, color = '#6366f1', height = 100, showAxes = false }: { data: number[], color?: string, height?: number, showAxes?: boolean }) => {
    // FIX: Handle cases with 0 or 1 data point to avoid division by zero
    if (!data || data.length < 2) return (
        <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">Нет данных</div>
    );
    
    const max = Math.max(...data, 5);
    
    const viewBoxWidth = 300;
    const viewBoxHeight = 100;
    const paddingX = 0;
    const paddingY = 5;
    const chartHeight = viewBoxHeight - paddingY * 2;
    
    const points = data.map((val, i) => {
        const x = paddingX + (i / (data.length - 1)) * (viewBoxWidth - paddingX * 2);
        const y = viewBoxHeight - paddingY - (val / max) * chartHeight;
        return [x, y];
    });

    const pathData = points.reduce((acc, [x, y], i, arr) => {
        if (i === 0) return `M ${x},${y}`;
        const [prevX, prevY] = arr[i - 1];
        const cp1x = prevX + (x - prevX) / 3;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) * 2 / 3;
        const cp2y = y;
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }, "");

    const fillPath = `${pathData} L ${viewBoxWidth - paddingX},${viewBoxHeight} L ${paddingX},${viewBoxHeight} Z`;

    return (
        <div className="w-full h-full relative flex flex-col">
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
            {showAxes && (
                <div className="flex justify-between text-[8px] text-slate-400 mt-2 font-mono uppercase w-full px-1 opacity-70">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
                </div>
            )}
        </div>
    );
};

// 3. Simple Bar Chart
const BarChart = ({ data, labels, colors }: { data: number[], labels: string[], colors?: string[] }) => {
    // Fixed max at 120 to allow for "Overachiever" visualization without breaking graph
    const max = 120;
    
    return (
        <div className="flex items-end justify-between h-24 gap-2 w-full px-2">
            {(data || []).map((val, i) => {
                const barColor = colors?.[i] || 'bg-emerald-400';
                const percent = Math.min(100, (val / max) * 100);
                const isOverflow = val > 100;
                
                return (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group relative">
                        <div className="relative w-full flex items-end justify-center h-full">
                             <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-t-lg w-full max-w-[32px] mx-auto" />
                             {/* Dashed line for 100% target */}
                             <div className="absolute top-[16.6%] left-0 right-0 border-t border-dashed border-slate-300 dark:border-slate-600 opacity-50 w-full" title="100% Goal"></div>
                             
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${percent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className={`w-full max-w-[32px] rounded-t-lg ${barColor} relative z-10 ${isOverflow ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                             >
                                 {isOverflow && (
                                     <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                 )}
                             </motion.div>
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-2 uppercase font-bold tracking-wider">{labels[i]}</span>
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded pointer-events-none z-20">
                            {Math.round(val)}%
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 3.1 Stacked Bar Chart
const StackedBarChart = ({ data, labels }: { data: { p: number, g: number, r: number }[], labels: string[] }) => {
    if (!data) return null;
    const totals = data.map(d => d.p + d.g + d.r);
    // Allow dynamic max, but ensure at least 100 for visual consistency
    const max = Math.max(...totals, 100);

    return (
        <div className="flex items-end justify-between h-24 gap-1 w-full">
            {data.map((d, i) => {
                const total = d.p + d.g + d.r;
                const heightPercent = max > 0 ? (total / max) * 100 : 0;
                
                // Calculate internal proportions
                const pPct = total ? (d.p / total) * 100 : 0;
                const gPct = total ? (d.g / total) * 100 : 0;
                const rPct = total ? (d.r / total) * 100 : 0;

                return (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group min-w-[8px]">
                        <div className="relative w-full flex items-end justify-center h-full">
                             <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-t-sm w-full max-w-[20px] mx-auto" />
                             
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="w-full max-w-[20px] rounded-t-sm overflow-hidden flex flex-col-reverse relative min-h-[2px] z-10"
                             >
                                {d.p > 0 && <div style={{ height: `${pPct}%` }} className="bg-indigo-500 w-full" />}
                                {d.g > 0 && <div style={{ height: `${gPct}%` }} className="bg-emerald-500 w-full" />}
                                {d.r > 0 && <div style={{ height: `${rPct}%` }} className="bg-rose-500 w-full" />}
                             </motion.div>
                        </div>
                        <span className="text-[7px] md:text-[8px] text-slate-400 mt-2 uppercase font-mono truncate w-full text-center tracking-tighter">{labels[i]}</span>
                        
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap">
                            {Math.round(total)}%
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 4. Weekly Habit Rhythm
const WeeklyHabitRhythm = ({ data }: { data: { label: string, percent: number, isToday: boolean }[] }) => {
    return (
        <div className="flex items-end justify-between h-full gap-2 w-full px-2">
            {(data || []).map((day, i) => {
                const intensity = Math.max(0.1, day.percent / 100);
                const isZero = day.percent === 0;
                return (
                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-2 group cursor-default">
                        <div className={`relative w-full flex-1 flex items-end justify-center rounded-lg overflow-hidden transition-all ${day.isToday && isZero ? 'bg-slate-50 dark:bg-slate-800 ring-2 ring-orange-400/50 ring-offset-1 dark:ring-offset-slate-900 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'}`}>
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${day.percent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05, type: 'spring' }}
                                className={`w-full rounded-t-sm ${isZero ? 'bg-transparent' : 'bg-gradient-to-t from-orange-400 to-amber-300'}`}
                                style={{ opacity: isZero ? 0 : 0.6 + intensity * 0.4 }}
                             />
                             {day.isToday && isZero && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" />
                                </div>
                             )}
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

// 5. Radar Chart
const RadarChart = ({ data, labels, color = '#6366f1' }: { data: number[], labels: string[], color?: string }) => {
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 30;
    const max = Math.max(...(data || []), 3);
    const count = (data || []).length;
    const angleStep = (Math.PI * 2) / count;

    const points = (data || []).map((val, i) => {
        const angle = i * angleStep - Math.PI / 2; 
        const r = (val / max) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    const gridLevels = [0.25, 0.5, 0.75, 1];
    
    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[180px]">
                {gridLevels.map((level, idx) => {
                    const gridPoints = Array.from({ length: count }).map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = radius * level;
                        const x = center + r * Math.cos(angle);
                        const y = center + r * Math.sin(angle);
                        return `${x},${y}`;
                    }).join(' ');
                    return (
                        <polygon key={idx} points={gridPoints} fill="none" stroke="currentColor" strokeOpacity={0.1} className="text-slate-400 dark:text-slate-500" />
                    );
                })}
                {Array.from({ length: count }).map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return (
                        <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.1} className="text-slate-400 dark:text-slate-500" />
                    );
                })}
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
                {labels.map((label, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const labelRadius = radius + 15; 
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);
                    return (
                        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500 font-mono">
                            {label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

// --- CORE LOGIC ENGINE ---
const useDashboardStats = (notes: Note[], tasks: Task[], habits: Habit[], journal: JournalEntry[], resetTime: number = 0) => {
    return useMemo(() => {
        const safeJournal = journal || [];
        const safeTasks = tasks || [];
        const safeHabits = habits || [];
        const safeNotes = notes || [];

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayStr = getLocalDateKey(today);
        
        // --- SCORING FORMULA ---
        // Score = (Habits % * 100) + (Challenges * 5) + (Journal * 1)
        
        // Helper: Calculate Day Score split by spheres
        const calculateDayScore = (date: Date) => {
            const dateKey = getLocalDateKey(date);
            const scores = { productivity: 0, growth: 0, relationships: 0 };
            
            // 1. HABITS (The Foundation - up to 100%)
            const habitCounts = {
                productivity: { total: 0, done: 0 },
                growth: { total: 0, done: 0 },
                relationships: { total: 0, done: 0 }
            };

            safeHabits.forEach(h => {
                if (!h.spheres || h.spheres.length === 0) return;
                
                // Check if active for this day
                const dayIndex = date.getDay();
                let applies = false;
                if (h.frequency === 'daily') applies = true;
                else if (h.frequency === 'specific_days') applies = h.targetDays?.includes(dayIndex) ?? false;
                else if (h.frequency === 'times_per_week') applies = true; 
                else if (h.frequency === 'times_per_day') applies = true;
                
                if (h.createdAt > date.getTime() + 86400000) applies = false;

                if (applies) {
                    const val = h.history?.[dateKey];
                    let completion = 0;
                    if (val) {
                        if (typeof val === 'boolean') completion = 1;
                        else if (typeof val === 'number') completion = Math.min(1, val / (h.targetCount || 1));
                    }

                    h.spheres.forEach(s => {
                        if (habitCounts[s as keyof typeof habitCounts]) {
                            habitCounts[s as keyof typeof habitCounts].total += 1;
                            habitCounts[s as keyof typeof habitCounts].done += completion;
                        }
                    });
                }
            });

            // Calculate Base Habit Score (0-100)
            Object.keys(habitCounts).forEach(k => {
                const key = k as keyof typeof habitCounts;
                const { total, done } = habitCounts[key];
                if (total > 0) {
                    scores[key] += (done / total) * 100;
                }
            });

            // 2. CHALLENGES (+5% per challenge)
            // Filter tasks created or completed on this date
            safeTasks.forEach(t => {
                if (!t.activeChallenge || !t.isChallengeCompleted) return;
                // Ideally track completion date, but falling back to check if task exists. 
                // Since this is a snapshot, we check if it IS completed. 
                // For "Activity history", we need a date. Assuming 'updatedAt' or similar doesn't exist,
                // we'll approximate using 'createdAt' for now, OR rely on the fact that Archive preserves state.
                // *Refinement*: For specific date history, checking task completion date is hard without a log.
                // We will count it if created on that day OR linked journal entry exists on that day?
                // Let's use `createdAt` for historical distribution to stay deterministic.
                const tDate = new Date(t.createdAt);
                if (getLocalDateKey(tDate) === dateKey) {
                     if (t.spheres) {
                         t.spheres.forEach(s => {
                             if (scores[s as keyof typeof scores] !== undefined) {
                                 scores[s as keyof typeof scores] += 5; // +5% Boost
                             }
                         });
                     }
                }
            });

            // 3. JOURNAL (+1% per entry)
            safeJournal.forEach(j => {
                const jDate = new Date(j.date);
                if (getLocalDateKey(jDate) === dateKey) {
                    if (j.spheres) {
                        j.spheres.forEach(s => {
                            if (scores[s as keyof typeof scores] !== undefined) {
                                scores[s as keyof typeof scores] += 1; // +1% Boost
                            }
                        });
                    }
                }
            });

            return scores;
        };

        // --- AGGREGATORS ---

        // 1. Today's Balance (Snapshot)
        // We use a 7-day moving average for stability in the Venn diagram, but the bar chart shows "Current State"
        // Let's calculate accumulated score for the LAST 7 DAYS for the "Balance" chart to make it meaningful.
        let balanceProd = 0, balanceGrowth = 0, balanceRel = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayScores = calculateDayScore(d);
            balanceProd += dayScores.productivity;
            balanceGrowth += dayScores.growth;
            balanceRel += dayScores.relationships;
        }
        // Average over 7 days
        balanceProd = Math.round(balanceProd / 7);
        balanceGrowth = Math.round(balanceGrowth / 7);
        balanceRel = Math.round(balanceRel / 7);

        const balanceData = [balanceProd, balanceGrowth, balanceRel];

        // 2. Activity History (Stacked Bar)
        const currentYear = today.getFullYear();
        const monthlyActivity = Array.from({length: 12}, () => ({ p: 0, g: 0, r: 0 }));
        const weeklyActivity = Array.from({length: 7}, () => ({ p: 0, g: 0, r: 0 }));
        const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const weekLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

        // Get Monday of current week
        const getMonday = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const m = new Date(date.setDate(diff));
            m.setHours(0, 0, 0, 0); 
            return m;
        };
        const monday = getMonday(new Date(today));

        // Populate Week
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            // Skip future days
            if (d > today) break;
            
            const scores = calculateDayScore(d);
            weeklyActivity[i] = {
                p: scores.productivity,
                g: scores.growth,
                r: scores.relationships
            };
        }

        // Populate Year (Sampled by iterating all habits/tasks might be slow, so we iterate days of year? Too slow)
        // Optimization: Iterate relevant objects and bucket them.
        // ACTUALLY: For the "Year" view, strict daily calculation is expensive.
        // Let's approximate based on raw counts for the Year view, but keep Week view accurate.
        // OR: Iterate days from beginning of year? (365 iterations is fine).
        const startOfYear = new Date(currentYear, 0, 1);
        const tempDate = new Date(startOfYear);
        while (tempDate <= today) {
            const mIdx = tempDate.getMonth();
            const scores = calculateDayScore(tempDate);
            // Accumulate daily scores into monthly buckets
            monthlyActivity[mIdx].p += scores.productivity;
            monthlyActivity[mIdx].g += scores.growth;
            monthlyActivity[mIdx].r += scores.relationships;
            tempDate.setDate(tempDate.getDate() + 1);
        }
        // Average monthly scores (divide by days in month passed?)
        // Or just let it be cumulative "Total Score"? Cumulative allows visualising "Best Month".
        // Let's normalize slightly so bars aren't huge (divide by ~30 to get avg daily score)
        monthlyActivity.forEach(m => {
            m.p = Math.round(m.p / 30);
            m.g = Math.round(m.g / 30);
            m.r = Math.round(m.r / 30);
        });


        // 3. Other Stats (Venn, Habits, etc - mostly legacy logic or simplified)
        const maxScore = Math.max(balanceProd, balanceGrowth, balanceRel, 100);
        const vennData = {
            productivity: (balanceProd / maxScore) * 100,
            growth: (balanceGrowth / maxScore) * 100,
            relationships: (balanceRel / maxScore) * 100
        };

        const totalEnergy = Math.round((balanceProd + balanceGrowth + balanceRel) / 3);
        let energyLabel = "Набираем темп";
        if (totalEnergy > 80) energyLabel = "Поток!";
        if (totalEnergy > 40 && totalEnergy <= 80) energyLabel = "Баланс";

        const notesHistory = [];
        for(let i=6; i>=0; i--) {
             const d = new Date(today);
             d.setDate(d.getDate() - i);
             const start = new Date(d.setHours(0,0,0,0)).getTime();
             const end = new Date(d.setHours(23,59,59,999)).getTime();
             const count = safeNotes.filter(n => n.createdAt >= start && n.createdAt <= end).length;
             notesHistory.push(count);
        }

        const weeklyHabitStats = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dStr = getLocalDateKey(d);
            // Sum all sphere scores for total habit rhythm? No, revert to habit specific logic for this chart?
            // Let's use the Base Habit % from calculation logic.
            // Re-calculate raw habit % for this chart to keep it specific to "Habits"
            let potential = 0; 
            let doneVal = 0;
            const dayIndex = d.getDay();
            safeHabits.forEach(h => {
                let applies = false;
                if (h.frequency === 'daily') applies = true;
                else if (h.frequency === 'specific_days') applies = h.targetDays?.includes(dayIndex) ?? false;
                else if (h.frequency === 'times_per_week') applies = true;
                else if (h.frequency === 'times_per_day') applies = true;
                if (h.createdAt > d.getTime() + 86400000) applies = false;
                if(applies) {
                    potential++;
                    const val = h.history?.[dStr];
                    if(val) {
                        if(typeof val === 'boolean') doneVal++;
                        else doneVal += Math.min(1, val/(h.targetCount||1));
                    }
                }
            });

            weeklyHabitStats.push({ 
                label: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i], 
                percent: potential > 0 ? (doneVal / potential) * 100 : 0,
                isToday: dStr === todayStr
            });
        }

        const chronotypeNotes = safeNotes.filter(n => n.createdAt >= resetTime);
        const chronotypeTasks = safeTasks.filter(t => t.createdAt >= resetTime);
        const chronotypeJournal = safeJournal.filter(j => j.date >= resetTime);

        const hoursDistribution = new Array(24).fill(0);
        chronotypeNotes.forEach(n => hoursDistribution[new Date(n.createdAt).getHours()]++);
        chronotypeTasks.forEach(t => hoursDistribution[new Date(t.createdAt).getHours()]++);
        chronotypeJournal.forEach(j => hoursDistribution[new Date(j.date).getHours()]++);

        const buckets = new Array(8).fill(0);
        const addToBucket = (timestamp: number) => {
            const hour = new Date(timestamp).getHours();
            const bucketIndex = Math.floor(hour / 3);
            buckets[bucketIndex]++;
        };

        chronotypeNotes.forEach(n => addToBucket(n.createdAt));
        chronotypeTasks.forEach(t => addToBucket(t.createdAt));
        chronotypeJournal.forEach(j => addToBucket(j.date));
        
        const bucketLabels = ['00', '03', '06', '09', '12', '15', '18', '21'];
        const radarData = buckets.reduce((a, b) => a + b, 0) === 0 ? buckets.map(() => 1) : buckets;
        
        const insightCount = safeJournal.filter(j => j.isInsight).length;

        return { vennData, energyLabel, notesHistory, weeklyHabitStats, radarData, bucketLabels, hoursDistribution, monthlyActivity, monthLabels, weeklyActivity, weekLabels, balanceData, insightCount };
    }, [notes, tasks, habits, journal, resetTime]);
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate }) => {
  const [chronotypeResetTime, setChronotypeResetTime] = useState(() => {
      const stored = localStorage.getItem('dashboard_chronotype_reset_time');
      return stored ? parseInt(stored) : 0;
  });
  
  const [activityView, setActivityView] = useState<'week' | 'year'>('week');

  const { vennData, energyLabel, notesHistory, weeklyHabitStats, radarData, bucketLabels, hoursDistribution, monthlyActivity, monthLabels, weeklyActivity, weekLabels, balanceData, insightCount } = useDashboardStats(notes, tasks, habits, journal, chronotypeResetTime);

  // Active Challenges
  const activeChallenges = (tasks || []).filter(t => t.activeChallenge && !t.isChallengeCompleted).slice(0, 3);
  const completedChallengesCount = (tasks || []).filter(t => t.isChallengeCompleted).length;

  const handleResetChronotype = () => {
      if(confirm('Сбросить текущие показания графика активности? Это не удалит данные, только очистит визуализацию')) {
          const now = Date.now();
          setChronotypeResetTime(now);
          localStorage.setItem('dashboard_chronotype_reset_time', now.toString());
      }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-light p-3 md:p-8 bg-[#f8fafc] dark:bg-[#0f172a]">
      <header className="mb-8">
        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Обзор</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Пульс твоей продуктивности</p>
      </header>
      
      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 max-w-7xl mx-auto pb-20 auto-rows-min">
        
        {/* 1. ENERGY OF THE DAY (Large Square - Top Left) */}
        <motion.div 
            className="md:col-span-1 md:row-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-between relative overflow-hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="w-full flex items-center gap-2 mb-2">
                <Activity size={16} className="text-slate-400" />
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

        {/* 5. CHALLENGES (Tall Light Card - Right) */}
        <motion.div 
            onClick={() => onNavigate(Module.KANBAN)}
            className="md:col-span-1 md:row-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative overflow-hidden cursor-pointer group"
        >
             <div className="flex items-center gap-2 mb-6">
                 <Zap size={16} className="text-indigo-500" />
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Вызовы</span>
             </div>
             
             <div className="flex-1 space-y-4 min-h-0">
                {activeChallenges.length > 0 ? (
                    activeChallenges.map(t => (
                        <div key={t.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors group/item">
                            <div className="text-sm font-medium leading-snug mb-3 line-clamp-2 text-slate-700 dark:text-slate-200">{t.content}</div>
                            {/* Gradient Progress Bar */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 w-2/3 rounded-full" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center opacity-40 py-10 flex flex-col items-center">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-3 text-slate-300 dark:text-slate-600">
                            <Medal size={24} />
                        </div>
                        <div className="text-xs text-slate-400">Нет активных вызовов</div>
                    </div>
                )}
             </div>
             
             <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400 uppercase tracking-widest">Зал славы</span>
                     <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completedChallengesCount}</span>
                 </div>
                 <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[10px] shadow-sm">🏆</div>)}
                 </div>
             </div>
        </motion.div>

        {/* 6. BALANCE (Bar Chart - Bottom Left) */}
        <motion.div className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                 <Target size={16} className="text-emerald-500" />
                 <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Баланс сфер (7 дн)</span>
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
                 <Lightbulb size={16} className="text-indigo-200" />
                 <span className="text-xs font-bold uppercase text-indigo-200 tracking-wider">Инсайты</span>
             </div>
             
             <div className="relative z-10">
                 <div className="text-5xl font-bold mb-1">{insightCount}</div>
                 <div className="text-sm font-medium text-indigo-100">Озарений в Дневнике</div>
                 <div className="text-[10px] text-indigo-300 mt-1 opacity-80">Перейти к рефлексии</div>
             </div>
        </motion.div>

        {/* 8. TOTAL ACTIVITY (Bottom Right - Updated) */}
        <motion.div className="md:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                     <Calendar size={16} className="text-slate-400" />
                     <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Общая активность</span>
                 </div>
                 {/* Toggle Switch */}
                 <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                     <button onClick={() => setActivityView('week')} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${activityView === 'week' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Неделя</button>
                     <button onClick={() => setActivityView('year')} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${activityView === 'year' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Год</button>
                 </div>
             </div>
             <div className="flex-1 flex items-end">
                 <StackedBarChart 
                    data={activityView === 'week' ? weeklyActivity : monthlyActivity} 
                    labels={activityView === 'week' ? weekLabels : monthLabels} 
                 />
             </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;
