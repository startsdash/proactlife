
import React, { useMemo } from 'react';
import { Habit } from '../types';
import { Flame } from 'lucide-react';

interface Props {
  habits: Habit[];
}

const ProgressStats: React.FC<Props> = ({ habits }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // --- CALCULATION FOR DAILY RING ---
  const dailyStats = useMemo(() => {
    let completed = 0;
    let total = 0;

    habits.forEach(h => {
        // Check if habit is active today
        let isActiveToday = true;
        if (h.frequency === 'specific_days' && h.targetDays) {
            const todayIndex = new Date().getDay();
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

  // --- CALCULATION FOR HEATMAP ---
  const heatmapData = useMemo(() => {
    const data: { date: string; count: number; intensity: number }[] = [];
    const endDate = new Date();
    // Show last 52 weeks (approx 1 year)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);

    // Create a map of all completions by date
    const completionsByDate: Record<string, number> = {};
    
    habits.forEach(h => {
        if (!h.history) return;
        Object.entries(h.history).forEach(([date, val]) => {
            if (val) {
                // Determine weight. boolean = 1, number (times per day) = 1 (if goal met) or fraction? 
                // Let's stick to: any progress = +1 weight per habit
                completionsByDate[date] = (completionsByDate[date] || 0) + 1;
            }
        });
    });

    // Generate grid data
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
        const dStr = tempDate.toISOString().split('T')[0];
        const count = completionsByDate[dStr] || 0;
        
        let intensity = 0;
        if (count === 0) intensity = 0;
        else if (count <= 2) intensity = 1;
        else if (count <= 4) intensity = 2;
        else if (count <= 6) intensity = 3;
        else intensity = 4;

        data.push({
            date: dStr,
            count,
            intensity
        });
        tempDate.setDate(tempDate.getDate() + 1);
    }
    return data;
  }, [habits]);

  // Group by weeks for the grid
  const weeks = useMemo(() => {
    const w: { date: string; count: number; intensity: number }[][] = [];
    let currentWeek: { date: string; count: number; intensity: number }[] = [];
    
    heatmapData.forEach((day, index) => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            w.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) w.push(currentWeek);
    return w;
  }, [heatmapData]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dailyStats.percent / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top-2">
      
      {/* DAILY RING CARD */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 col-span-1">
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
             <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${dailyStats.percent === 100 ? 'text-emerald-500' : 'text-orange-500'}`}
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{dailyStats.completed}/{dailyStats.total}</span>
             </div>
        </div>
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Сегодня</div>
            <h3 className="text-lg font-light text-slate-800 dark:text-slate-200 leading-tight">
                {dailyStats.percent === 100 ? 'Всё выполнено!' : 'Держи ритм'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {dailyStats.percent}% плана на день
            </p>
        </div>
      </div>

      {/* HEATMAP CARD */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-3 flex flex-col justify-center overflow-hidden">
        <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                 <Flame size={16} className="text-orange-500" />
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Активность (Год)</span>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                 <span>Меньше</span>
                 <div className="w-2 h-2 rounded-sm bg-slate-100 dark:bg-slate-800" />
                 <div className="w-2 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-900/40" />
                 <div className="w-2 h-2 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                 <div className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                 <span>Больше</span>
             </div>
        </div>
        
        <div className="w-full overflow-x-auto pb-2 custom-scrollbar-light" dir="rtl">
            <div className="flex gap-1 min-w-max" dir="ltr">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((day, dIdx) => (
                            <div 
                                key={dIdx}
                                title={`${day.date}: ${day.count} выполнено`}
                                className={`
                                    w-2.5 h-2.5 rounded-sm transition-colors
                                    ${day.intensity === 0 ? 'bg-slate-100 dark:bg-slate-800' : ''}
                                    ${day.intensity === 1 ? 'bg-emerald-200 dark:bg-emerald-900/40' : ''}
                                    ${day.intensity === 2 ? 'bg-emerald-300 dark:bg-emerald-800' : ''}
                                    ${day.intensity === 3 ? 'bg-emerald-400 dark:bg-emerald-600' : ''}
                                    ${day.intensity === 4 ? 'bg-emerald-600 dark:bg-emerald-500' : ''}
                                `}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </div>

    </div>
  );
};

export default ProgressStats;
