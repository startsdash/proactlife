
import React, { useMemo, useState } from 'react';
import { Habit } from '../types';
import { Flame, Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  habits: Habit[];
}

type TimeRange = 'week' | 'month' | 'year';

// Helper to get local date string YYYY-MM-DD
const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ProgressStats: React.FC<Props> = ({ habits }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const today = new Date();
  const todayStr = getLocalDateKey(today);

  // --- STATS CALCULATION ENGINE ---
  const getDayStats = (date: Date) => {
      const dStr = getLocalDateKey(date);
      const dayIndex = date.getDay(); // 0-6
      
      let totalPotential = 0;
      let totalCompletedValue = 0;

      habits.forEach(h => {
          let applies = false;
          // Determine if habit is "active" for this day
          if (h.frequency === 'daily') applies = true;
          else if (h.frequency === 'specific_days') applies = h.targetDays?.includes(dayIndex) ?? false;
          else if (h.frequency === 'times_per_week') applies = true; // Simplified: available any day
          else if (h.frequency === 'times_per_day') applies = true; // Available any day

          // If created after this date, it doesn't count
          if (h.createdAt > date.getTime() + 86400000) applies = false;

          if (applies) {
              totalPotential++;
              const val = h.history?.[dStr];
              if (val) {
                  if (typeof val === 'boolean') {
                      totalCompletedValue += 1;
                  } else if (typeof val === 'number') {
                      const target = h.targetCount || 1;
                      // FIX: Count partial progress (e.g. 1/3) instead of full completion
                      totalCompletedValue += Math.min(1, val / target);
                  }
              }
          }
      });

      const percentage = totalPotential === 0 ? 0 : Math.round((totalCompletedValue / totalPotential) * 100);
      
      return {
          date,
          str: dStr,
          percentage,
          display: totalPotential === 0 ? '-' : `${Math.round(totalCompletedValue * 10) / 10}/${totalPotential}`,
          isToday: dStr === todayStr
      };
  };

  // --- DAILY RING STATS (Using new logic) ---
  const dailyStats = useMemo(() => {
      const stats = getDayStats(new Date());
      // Re-map for the Ring interface
      return { 
          percent: stats.percentage, 
          label: stats.display 
      };
  }, [habits, todayStr]);

  // --- COLOR LOGIC ---
  const getRingColor = (p: number) => {
      if (p >= 100) return 'text-emerald-500';
      if (p >= 66) return 'text-indigo-500';
      if (p >= 33) return 'text-orange-500';
      if (p > 0) return 'text-rose-500';
      return 'text-slate-200 dark:text-slate-700';
  };

  const getProgressColor = (p: number) => {
      if (p === 0) return 'bg-slate-100 dark:bg-slate-800';
      if (p < 30) return 'bg-rose-400 dark:bg-rose-600';
      if (p < 70) return 'bg-orange-400 dark:bg-orange-600';
      if (p < 100) return 'bg-indigo-400 dark:bg-indigo-600';
      return 'bg-emerald-500 dark:bg-emerald-500';
  };

  const getGradient = (p: number) => {
      if (p === 0) return 'none';
      if (p < 30) return 'linear-gradient(to top, #fb7185, #f43f5e)'; // Rose
      if (p < 70) return 'linear-gradient(to top, #fbbf24, #f97316)'; // Amber/Orange
      if (p < 100) return 'linear-gradient(to top, #818cf8, #6366f1)'; // Indigo
      return 'linear-gradient(to top, #34d399, #10b981)'; // Emerald
  };

  const formatDate = (dateStr: string) => {
      try {
          const [y, m, d] = dateStr.split('-');
          return `${d}.${m}.${y}`;
      } catch (e) {
          return dateStr;
      }
  };

  // --- HEATMAP RENDERER ---
  const renderHeatmap = () => {
      if (timeRange === 'week') {
          // Get start of current week (Monday)
          const startOfWeek = new Date(today);
          const currentDay = startOfWeek.getDay() || 7; // 1(Mon) - 7(Sun)
          const diffToMon = currentDay - 1;
          startOfWeek.setDate(startOfWeek.getDate() - diffToMon);
          startOfWeek.setHours(0,0,0,0);

          const days = [];
          for (let i = 0; i < 7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              days.push(getDayStats(d));
          }

          const weekDaysRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

          return (
              <div className="grid grid-cols-7 gap-2 h-full">
                  {days.map((day, idx) => (
                      <div key={day.str} className="flex flex-col gap-1 h-full relative group cursor-default">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              {formatDate(day.str)}: {day.percentage}%
                          </div>
                          
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden flex items-end">
                              <motion.div 
                                className="w-full"
                                initial={{ height: 0 }}
                                animate={{ height: `${day.percentage}%` }}
                                transition={{ duration: 0.5, type: 'spring' }}
                                style={{ background: getGradient(day.percentage) }}
                              />
                              {day.isToday && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full ring-1 ring-white dark:ring-slate-900" />}
                          </div>
                          
                          <div className="text-center">
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{weekDaysRu[idx]}</div>
                              <div className={`text-xs font-medium ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>{day.date.getDate()}</div>
                          </div>
                      </div>
                  ))}
              </div>
          );
      }

      if (timeRange === 'month') {
          const year = today.getFullYear();
          const month = today.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 Sun, 1 Mon...
          
          // Adjust for Mon start (0->6, 1->0...)
          const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
          
          const gridCells = [];
          // Empty cells
          for(let i=0; i<offset; i++) gridCells.push(null);
          // Days
          for(let i=1; i<=daysInMonth; i++) {
              const d = new Date(year, month, i);
              gridCells.push(getDayStats(d));
          }

          return (
              <div className="h-full flex flex-col">
                  <div className="grid grid-cols-7 gap-1 mb-1">
                     {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="text-center text-[9px] text-slate-400 uppercase">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                      {gridCells.map((day, idx) => {
                          if (!day) return <div key={`empty-${idx}`} />;
                          
                          // Circular Progress Logic for Month View using ViewBox
                          const viewBoxSize = 24;
                          const strokeWidth = 3;
                          const radius = 9; // (24 - 2*3)/2 + margin adjustments, let's keep it safe inside
                          const cx = 12;
                          const cy = 12;
                          const circ = 2 * Math.PI * radius;
                          const offset = circ - (day.percentage / 100) * circ;
                          
                          let strokeColor = "text-slate-300 dark:text-slate-600";
                          if (day.percentage > 0) strokeColor = "text-rose-400";
                          if (day.percentage >= 30) strokeColor = "text-orange-400";
                          if (day.percentage >= 70) strokeColor = "text-indigo-400";
                          if (day.percentage >= 100) strokeColor = "text-emerald-500";

                          return (
                              <div 
                                key={day.str} 
                                className={`aspect-square rounded-md bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center relative group cursor-default border border-slate-100 dark:border-slate-800 ${day.isToday ? 'ring-1 ring-orange-500 z-10' : ''}`}
                              >
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                      {formatDate(day.str)}: {day.percentage}%
                                  </div>

                                  <div className="relative w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                                      {/* Mini Circular Progress with ViewBox */}
                                      {day.percentage > 0 && (
                                          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
                                              <circle cx={cx} cy={cy} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-slate-200 dark:text-slate-700 opacity-30" />
                                              <circle cx={cx} cy={cy} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={`${strokeColor} transition-all duration-300`} />
                                          </svg>
                                      )}
                                      <span className={`text-[9px] md:text-[10px] font-medium z-10 ${day.isToday ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{day.date.getDate()}</span>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          );
      }

      if (timeRange === 'year') {
         const days: any[] = [];
         const endDate = new Date();
         const startDate = new Date();
         startDate.setDate(startDate.getDate() - 364);
         
         const tempDate = new Date(startDate);
         while (tempDate <= endDate) {
             days.push(getDayStats(new Date(tempDate)));
             tempDate.setDate(tempDate.getDate() + 1);
         }

         // Group by weeks for horizontal scroll layout
         const weeks: any[][] = [];
         let currentWeek: any[] = [];
         days.forEach(day => {
             currentWeek.push(day);
             if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
         });
         if (currentWeek.length > 0) weeks.push(currentWeek);

         return (
             <div className="w-full h-full overflow-x-auto custom-scrollbar-light pb-1" dir="rtl">
                <div className="flex gap-1 min-w-max h-full items-center" dir="ltr">
                    {weeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-1">
                            {week.map((day, dIdx) => (
                                <div 
                                    key={dIdx}
                                    title={`${formatDate(day.str)}: ${day.percentage}%`}
                                    className={`w-2.5 h-2.5 rounded-sm transition-colors ${getProgressColor(day.percentage)}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
             </div>
         );
      }
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dailyStats.percent / 100) * circumference;
  const ringColorClass = getRingColor(dailyStats.percent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top-2">
      
      {/* DAILY RING CARD */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 col-span-1">
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`transition-all duration-1000 ease-out ${ringColorClass}`} />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{dailyStats.label}</span>
             </div>
        </div>
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Сегодня</div>
            <h3 className={`text-lg font-light leading-tight transition-colors duration-500 ${dailyStats.percent === 100 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                {dailyStats.percent === 100 ? 'Всё выполнено!' : dailyStats.percent > 50 ? 'Отличный темп' : 'Начни сейчас'}
            </h3>
            <p className={`text-xs mt-1 font-medium transition-colors duration-500 ${ringColorClass}`}>{dailyStats.percent}% плана</p>
        </div>
      </div>

      {/* HEATMAP CARD */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-3 flex flex-col">
        <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                 <Flame size={16} className="text-orange-500" />
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                     {timeRange === 'week' ? 'Активность (Неделя)' : timeRange === 'month' ? 'Активность (Месяц)' : 'Активность (Год)'}
                 </span>
             </div>
             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                 <button onClick={() => setTimeRange('week')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === 'week' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Неделя</button>
                 <button onClick={() => setTimeRange('month')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === 'month' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Месяц</button>
                 <button onClick={() => setTimeRange('year')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === 'year' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Год</button>
             </div>
        </div>
        
        <div className="flex-1 min-h-[80px]">
            {renderHeatmap()}
        </div>
      </div>

    </div>
  );
};

export default ProgressStats;
