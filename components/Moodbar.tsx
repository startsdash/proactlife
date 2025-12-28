
import React, { useMemo, useState } from 'react';
import { JournalEntry } from '../types';
import { MOOD_TAGS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Thermometer, Calendar, TrendingUp, X } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface Props {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

const MOODS = [
    { value: 1, label: 'Ужасно', emoji: '😖', color: 'from-rose-500 to-red-600', text: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { value: 2, label: 'Плохо', emoji: '😕', color: 'from-orange-400 to-red-500', text: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { value: 3, label: 'Нормально', emoji: '😐', color: 'from-yellow-400 to-orange-400', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { value: 4, label: 'Хорошо', emoji: '🙂', color: 'from-teal-400 to-emerald-500', text: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { value: 5, label: 'Отлично', emoji: '🤩', color: 'from-indigo-400 to-purple-500', text: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
];

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- CHART COMPONENTS ---

// 1. Mood Wave (Smoothed Area Chart)
const MoodWave = ({ data }: { data: { date: number, mood: number }[] }) => {
    if (!data || data.length < 2) return <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Мало данных для волны</div>;

    const height = 100;
    const width = 300;
    const paddingX = 10;
    const paddingY = 10;
    const chartHeight = height - paddingY * 2;
    const chartWidth = width - paddingX * 2;

    const points = data.map((d, i) => {
        const x = paddingX + (i / (data.length - 1)) * chartWidth;
        // Invert Y because SVG coords top-down. 5 is top (0), 1 is bottom (height)
        const y = paddingY + (1 - (d.mood - 1) / 4) * chartHeight; 
        return [x, y];
    });

    const pathData = points.reduce((acc, [x, y], i, arr) => {
        if (i === 0) return `M ${x},${y}`;
        const [prevX, prevY] = arr[i - 1];
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }, "");

    // Gradient fill area
    const areaPath = `${pathData} L ${width - paddingX},${height} L ${paddingX},${height} Z`;

    return (
        <div className="w-full h-40 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Guidelines */}
                <line x1={paddingX} y1={paddingY} x2={width-paddingX} y2={paddingY} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="3 3" className="text-emerald-500" />
                <line x1={paddingX} y1={height/2} x2={width-paddingX} y2={height/2} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="3 3" className="text-yellow-500" />
                <line x1={paddingX} y1={height-paddingY} x2={width-paddingX} y2={height-paddingY} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="3 3" className="text-red-500" />

                <motion.path 
                    initial={{ d: `M ${paddingX},${height} L ${width-paddingX},${height} L ${width-paddingX},${height} L ${paddingX},${height} Z` }}
                    animate={{ d: areaPath }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    fill="url(#waveGradient)" 
                />
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    d={pathData}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                {points.map(([x,y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" className="fill-white dark:fill-slate-900 stroke-indigo-500" strokeWidth="2" />
                ))}
            </svg>
        </div>
    );
};

// 2. Mood Spectrum (Bar Chart)
const MoodSpectrum = ({ distribution }: { distribution: number[] }) => {
    const total = distribution.reduce((a, b) => a + b, 0);
    const max = Math.max(...distribution, 1);

    return (
        <div className="flex items-end justify-between h-32 gap-3 w-full px-2">
            {distribution.map((count, i) => {
                const mood = MOODS[i];
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                const heightPercent = (count / max) * 100;
                
                return (
                    <div key={mood.value} className="flex flex-col items-center justify-end flex-1 h-full group">
                        <div className="text-[10px] font-bold text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count} дн.</div>
                        <div className="relative w-full rounded-lg bg-slate-100 dark:bg-slate-800 flex items-end overflow-hidden h-full">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercent}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className={`w-full bg-gradient-to-t ${mood.color} opacity-80 group-hover:opacity-100 transition-opacity`}
                            />
                        </div>
                        <div className="mt-2 text-center">
                            <div className="text-lg">{mood.emoji}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{percent}%</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 3. Mood Calendar (Heatmap)
const MoodCalendar = ({ history }: { history: Record<string, number> }) => {
    const today = new Date();
    // Generate last 28 days (4 weeks)
    const days = Array.from({ length: 28 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (27 - i));
        return d;
    });

    return (
        <div className="grid grid-cols-7 gap-1">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-[9px] text-slate-400 font-bold uppercase mb-1">{d}</div>
            ))}
            {days.map((date) => {
                const dateKey = getLocalDateKey(date);
                const moodVal = history[dateKey]; // Average mood for day or undefined
                const moodConfig = MOODS.find(m => m.value === Math.round(moodVal || 0));
                
                return (
                    <Tooltip key={dateKey} content={`${date.toLocaleDateString()}: ${moodVal ? moodConfig?.label : 'Нет данных'}`}>
                        <div className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-all cursor-default border ${
                            moodVal 
                            ? `bg-gradient-to-br ${moodConfig?.color} text-white border-transparent shadow-sm` 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-700'
                        }`}>
                            {date.getDate()}
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
};


const Moodbar: React.FC<Props> = ({ entries, onAddEntry }) => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview');

  // Compute Stats
  const { history, waveData, distribution, averageMood, dominantMood } = useMemo(() => {
      const history: Record<string, number> = {};
      const counts = [0, 0, 0, 0, 0]; // 1 to 5
      let totalMood = 0;
      let moodCount = 0;

      // Filter entries with mood
      const moodEntries = entries.filter(e => e.mood).sort((a, b) => a.date - b.date);

      moodEntries.forEach(e => {
          const k = getLocalDateKey(new Date(e.date));
          // Simple logic: if multiple entries per day, take latest (or average if you prefer)
          // Let's take average for smoother graphs
          if (!history[k]) history[k] = e.mood!;
          else history[k] = (history[k] + e.mood!) / 2;
          
          counts[e.mood! - 1]++;
          totalMood += e.mood!;
          moodCount++;
      });

      // Wave Data (Last 14 days filled)
      const waveData = [];
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const k = getLocalDateKey(d);
          if (history[k]) {
              waveData.push({ date: d.getTime(), mood: history[k] });
          }
      }

      const averageMood = moodCount > 0 ? (totalMood / moodCount).toFixed(1) : '-';
      const maxCount = Math.max(...counts);
      const dominantIndex = counts.indexOf(maxCount);
      const dominantMood = moodCount > 0 ? MOODS[dominantIndex] : null;

      return { history, waveData, distribution: counts, averageMood, dominantMood };
  }, [entries]);

  const handleSave = () => {
      if (!selectedMood) return;
      const entry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content: `Настроение: ${MOODS[selectedMood-1].label} ${selectedTags.length > 0 ? `(${selectedTags.join(', ')})` : ''}`,
          mood: selectedMood,
          moodTags: selectedTags,
          isInsight: false
      };
      onAddEntry(entry);
      
      // Reset with animation
      setSelectedMood(null);
      setSelectedTags([]);
      
      // Confetti for good mood
      if (selectedMood >= 4 && window.confetti) {
          window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#a78bfa', '#34d399'] });
      }
  };

  const activeMoodConfig = selectedMood ? MOODS[selectedMood - 1] : null;

  return (
    <div className={`h-full overflow-y-auto custom-scrollbar-light p-4 md:p-8 bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-700 ${activeMoodConfig ? activeMoodConfig.bg.replace('/20', '/10') : ''}`}>
        
        {/* HEADER */}
        <header className="mb-8 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                    Moodbar <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider dark:bg-indigo-900 dark:text-indigo-300">Pulse</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Эквалайзер твоего состояния</p>
            </div>
            <div className="hidden md:flex gap-4">
                <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Среднее</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{averageMood}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Доминанта</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{dominantMood ? dominantMood.emoji : '-'}</div>
                </div>
            </div>
        </header>

        {/* INPUT SECTION (THE PULSE) */}
        <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-all duration-500">
                
                {/* Dynamic Background Mesh */}
                <div className={`absolute inset-0 opacity-20 pointer-events-none transition-colors duration-700 bg-gradient-to-br ${activeMoodConfig ? activeMoodConfig.color : 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900'}`} />
                
                <div className="relative z-10">
                    <h2 className="text-center text-lg font-medium text-slate-600 dark:text-slate-300 mb-8">Как ты чувствуешь себя сейчас?</h2>
                    
                    {/* MOOD SELECTOR */}
                    <div className="flex justify-between items-center max-w-lg mx-auto gap-2 md:gap-4 mb-10">
                        {MOODS.map((m) => (
                            <button
                                key={m.value}
                                onClick={() => setSelectedMood(m.value)}
                                className={`
                                    relative group transition-all duration-300
                                    ${selectedMood === m.value ? 'scale-125 -translate-y-2' : 'hover:scale-110 hover:-translate-y-1 opacity-70 hover:opacity-100'}
                                `}
                            >
                                <div className={`text-4xl md:text-6xl drop-shadow-sm transition-transform duration-300 ${selectedMood === m.value ? 'animate-bounce-slow' : ''}`}>
                                    {m.emoji}
                                </div>
                                <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${selectedMood === m.value ? 'opacity-100 text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                    {m.label}
                                </div>
                                {selectedMood === m.value && (
                                    <motion.div layoutId="highlight" className="absolute inset-0 bg-white/20 blur-xl rounded-full -z-10" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* CONTEXT TAGS (Expandable) */}
                    <AnimatePresence>
                        {selectedMood && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="max-w-lg mx-auto border-t border-slate-100 dark:border-slate-700/50 pt-6">
                                    <p className="text-xs font-bold text-center text-slate-400 uppercase tracking-wider mb-4">Что влияет?</p>
                                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                                        {MOOD_TAGS.map(tag => {
                                            const isSelected = selectedTags.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => setSelectedTags(prev => isSelected ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                                                    className={`
                                                        px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2
                                                        ${isSelected 
                                                            ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white shadow-md' 
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}
                                                    `}
                                                >
                                                    <span>{tag.emoji}</span> {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={handleSave}
                                        className={`w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r ${activeMoodConfig?.color}`}
                                    >
                                        Зафиксировать
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* STATS SECTION */}
        <div className="max-w-6xl mx-auto">
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-none">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Activity size={16} /> Обзор волны
                </button>
                <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Calendar size={16} /> Календарь
                </button>
            </div>

            {waveData.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <Thermometer size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Начни отмечать настроение, чтобы увидеть статистику</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT COL: WAVE & SPECTRUM */}
                    <div className="md:col-span-2 space-y-6">
                        {activeTab === 'overview' && (
                            <>
                                <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={16} /> Динамика (14 дней)</h3>
                                    </div>
                                    <MoodWave data={waveData} />
                                </div>
                                <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Спектр эмоций</h3>
                                    <MoodSpectrum distribution={distribution} />
                                </div>
                            </>
                        )}
                        {activeTab === 'calendar' && (
                             <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Хроника состояния (28 дней)</h3>
                                 <MoodCalendar history={history} />
                             </div>
                        )}
                    </div>

                    {/* RIGHT COL: INSIGHTS & SUMMARY */}
                    <div className="space-y-6">
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Текущий статус</h3>
                            <div className="text-3xl font-bold mb-4">{averageMood >= 4 ? 'На подъеме 🚀' : averageMood >= 3 ? 'Стабильно ⚓️' : 'Нужен отдых 🔋'}</div>
                            <div className="text-sm opacity-90 leading-relaxed">
                                {averageMood >= 4 
                                    ? "Отличное время для сложных задач и творчества. Используй этот импульс!" 
                                    : "Фокусируйся на восстановлении и рутине. Не требуй от себя невозможного."}
                            </div>
                        </div>

                        {/* DOMINANT MOOD CARD */}
                        {dominantMood && (
                            <div className={`rounded-3xl p-6 border transition-colors bg-gradient-to-br ${dominantMood.bg} border-transparent`}>
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">{dominantMood.emoji}</div>
                                    <div>
                                        <div className="text-xs font-bold uppercase opacity-60">Чаще всего</div>
                                        <div className={`text-xl font-bold ${dominantMood.text}`}>{dominantMood.label}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Moodbar;
