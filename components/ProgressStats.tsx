
import React, { useMemo, useState } from 'react';
import { Habit } from '../types';
import { Flame, Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  habits: Habit[];
}

type TimeRange = 'week' | 'month' | 'year';

const ProgressStats: React.FC<Props> = ({ habits }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // --- DAILY RING STATS ---
  const dailyStats = useMemo(() => {
    let completed = 0;
    let total = 0;

    habits.forEach(h => {
        let isActiveToday = true;
        if (h.frequency === 'specific_days' && h.targetDays) {
            const todayIndex = today.getDay();
            isActiveToday = h.targetDays.includes(todayIndex);
        }
        
        if (isActiveToday) {
            total++;
            const historyVal = h.history?.[todayStr];
            
            if (h.frequency === 'times_per_day') {
                const target = h.targetCount || 1;
                const current = typeof historyVal === 'number' ? historyVal : (historyVal ? target : 0);
                if (current >= target) completed++;
            } else {
                if (historyVal) completed++;
            }
        }
    });

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, total, percent };
  }, [habits, todayStr]);

  // --- COLOR LOGIC ---
  const getRingColor = (p: number) => {
      if (p === 100) return 'text-emerald-500';
      if (p >= 66) return 'text-indigo-500';
      if (p >= 33) return 'text-orange-500';
      if (p > 0) return 'text-rose-500';
      return 'text-slate-200 dark:text-slate-700'; // Empty
  };

  // --- HEATMAP CALCULATION ---
  const renderHeatmap = () => {
      // Common: Map history to dates
      const completionsByDate: Record<string, number> = {};
      habits.forEach(h => {
          if (!h.history) return;
          Object.entries(h.history).forEach(([date, val]) => {
              if (val) completionsByDate[date] = (completionsByDate[date] || 0) + 1;
          });
      });

      const getIntensity = (count: number) => {
          if (count === 0) return 0;
          if (count <= 2) return 1;
          if (count <= 4) return 2;
          if (count <= 6) return 3;
          return 4;
      };

      const getColor = (intensity: number) => {
          switch(intensity) {
              case 0: return 'bg-slate-100 dark:bg-slate-800';
              case 1: return 'bg-emerald-200 dark:bg-emerald-900/40';
              case 2: return 'bg-emerald-300 dark:bg-emerald-800';
              case 3: return 'bg-emerald-400 dark:bg-emerald-600';
              case 4: return 'bg-emerald-500 dark:bg-emerald-500';
              default: return 'bg-slate-100 dark:bg-slate-800';
          }
      };

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
              const dStr = d.toISOString().split('T')[0];
              const count = completionsByDate[dStr] || 0;
              days.push({ 
                  date: d, 
                  str: dStr, 
                  count, 
                  intensity: getIntensity(count),
                  isToday: dStr === todayStr 
              });
          }

          const weekDaysRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

          return (
              <div className="grid grid-cols-7 gap-1 h-full">
                  {days.map((day, idx) => (
                      <div key={day.str} className="flex flex-col gap-1 h-full">
                          <div className={`flex-1 rounded-lg ${getColor(day.intensity)} transition-all duration-500 relative group`}>
                              {day.isToday && <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white dark:ring-slate-900" />}
                              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 transition-opacity">
                                  {day.count}
                              </div>
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
              const dStr = d.toISOString().split('T')[0];
              const count = completionsByDate[dStr] || 0;
              gridCells.push({
                  date: i,
                  str: dStr,
                  count,
                  intensity: getIntensity(count),
                  isToday: dStr === todayStr
              });
          }

          return (
              <div className="h-full flex flex-col">
                  <div className="grid grid-cols-7 gap-1 mb-1">
                     {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="text-center text-[9px] text-slate-400 uppercase">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                      {gridCells.map((cell, idx) => {
                          if (!cell) return <div key={`empty-${idx}`} />;
                          return (
                              <div 
                                key={cell.str} 
                                title={`${cell.date}: ${cell.count}`}
                                className={`aspect-square rounded-md ${getColor(cell.intensity)} flex items-center justify-center text-[10px] ${cell.isToday ? 'ring-1 ring-orange-500 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                              >
                                  <span className={cell.intensity > 2 ? 'text-emerald-900 dark:text-emerald-100 font-bold' : 'text-slate-500 dark:text-slate-400'}>{cell.date}</span>
                              </div>
                          )
                      })}
                  </div>
              </div>
          );
      }

      // YEAR VIEW (Default existing logic)
      if (timeRange === 'year') {
         const data: { date: string; count: number; intensity: number }[] = [];
         const endDate = new Date();
         const startDate = new Date();
         startDate.setDate(startDate.getDate() - 364);
         
         const tempDate = new Date(startDate);
         while (tempDate <= endDate) {
             const dStr = tempDate.toISOString().split('T')[0];
             const count = completionsByDate[dStr] || 0;
             data.push({ date: dStr, count, intensity: getIntensity(count) });
             tempDate.setDate(tempDate.getDate() + 1);
         }

         // Group by weeks
         const weeks: typeof data[] = [];
         let currentWeek: typeof data = [];
         data.forEach(day => {
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
                                    title={`${day.date}: ${day.count} выполнено`}
                                    className={`w-2.5 h-2.5 rounded-sm ${getColor(day.intensity)}`}
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
                 <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{dailyStats.completed}/{dailyStats.total}</span>
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
