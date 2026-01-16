
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Module, Note, Task, Habit, JournalEntry, Flashcard } from '../types';
import { Bot, Check, ArrowRight, X, Radio, Activity, Zap, Play, ChevronRight } from 'lucide-react';

interface Props {
  onClose: () => void;
  onNavigate: (m: Module) => void;
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  flashcards: Flashcard[];
}

const STEPS = [
    {
        id: 'init',
        module: Module.NAPKINS,
        label: 'ИНИЦИАЛИЗАЦИЯ',
        dialogue: "Приветствую, Архитектор. Система онлайн. Я фиксирую высокий уровень когнитивного шума. Первая директива: выгрузи любую мысль в буфер обмена.",
        objective: "Создай новую заметку во «Входящих».",
    },
    {
        id: 'archive',
        module: Module.NAPKINS,
        label: 'ФИЛЬТРАЦИЯ',
        dialogue: "Данные приняты. Сырой материал нестабилен. Для долгосрочного хранения перемести обработанную мысль в ядро памяти.",
        objective: "Отправь заметку в «Библиотеку» (Архив).",
    },
    {
        id: 'synthesis',
        module: Module.SANDBOX,
        label: 'СИНТЕЗ',
        dialogue: "Переходим к обработке. В «Хабе» мы трансформируем хаос в структуру. Используй ИИ-ментора для анализа или кристаллизуй знание.",
        objective: "Перейди в «Хаб» и создай Скилл (Flashcard) или Задачу из мысли.",
    },
    {
        id: 'execution',
        module: Module.KANBAN,
        label: 'ПРОТОКОЛ ДЕЙСТВИЯ',
        dialogue: "Знание без действия бесполезно. Система требует кинетической энергии. Активируй задачу в модуле Спринтов.",
        objective: "В «Спринтах» перетащи задачу в колонку «В работе» или создай новую.",
    },
    {
        id: 'log',
        module: Module.JOURNAL,
        label: 'ТЕЛЕМЕТРИЯ',
        dialogue: "Любое действие оставляет след. Зафиксируй свое состояние или результат выполнения в бортовом журнале.",
        objective: "Создай запись в «Дневнике».",
    },
    {
        id: 'system',
        module: Module.RITUALS,
        label: 'ЦИКЛ',
        dialogue: "Разовые действия слабы. Сила в повторении. Установи новый ритм для поддержания энергосистемы.",
        objective: "Создай привычку в «Трекере».",
    }
];

const TypewriterText: React.FC<{ text: string, onComplete?: () => void }> = ({ text, onComplete }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
        let i = 0;
        setDisplayed('');
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayed(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
                onComplete?.();
            }
        }, 30);
        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayed}</span>;
};

const MiniChart = ({ value, max, color }: { value: number, max: number, color: string }) => (
    <div className="flex items-end gap-0.5 h-8">
        {Array.from({ length: 5 }).map((_, i) => (
            <div 
                key={i} 
                className={`w-1.5 rounded-sm transition-all duration-500 ${i < (value / max) * 5 ? color : 'bg-slate-800'}`} 
                style={{ height: `${20 + Math.random() * 80}%` }}
            />
        ))}
    </div>
);

const LearningMode: React.FC<Props> = ({ onClose, onNavigate, notes, tasks, habits, journal, flashcards }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isStepComplete, setIsStepComplete] = useState(false);
  
  // Snapshots for comparison
  const [initialCounts, setInitialCounts] = useState({
      notes: 0,
      archivedNotes: 0,
      tasks: 0,
      doingTasks: 0,
      journal: 0,
      habits: 0,
      flashcards: 0
  });

  const currentStep = STEPS[stepIndex];

  // Initialize Counts on Start
  const startProtocol = () => {
      setInitialCounts({
          notes: notes.length,
          archivedNotes: notes.filter(n => n.status === 'archived').length,
          tasks: tasks.length,
          doingTasks: tasks.filter(t => t.column === 'doing').length,
          journal: journal.length,
          habits: habits.length,
          flashcards: flashcards.length
      });
      setIsStarted(true);
      onNavigate(STEPS[0].module);
  };

  // CHECK LOGIC
  useEffect(() => {
      if (!isStarted) return;
      
      let complete = false;
      const archivedCount = notes.filter(n => n.status === 'archived').length;
      const doingCount = tasks.filter(t => t.column === 'doing').length;

      switch (currentStep.id) {
          case 'init':
              if (notes.length > initialCounts.notes) complete = true;
              break;
          case 'archive':
              if (archivedCount > initialCounts.archivedNotes) complete = true;
              break;
          case 'synthesis':
              if (tasks.length > initialCounts.tasks || flashcards.length > initialCounts.flashcards) complete = true;
              break;
          case 'execution':
              if (doingCount > initialCounts.doingTasks || tasks.length > initialCounts.tasks) complete = true;
              break;
          case 'log':
              if (journal.length > initialCounts.journal) complete = true;
              break;
          case 'system':
              if (habits.length > initialCounts.habits) complete = true;
              break;
      }

      if (complete && !isStepComplete) {
          setIsStepComplete(true);
          // Play sound effect if possible
          const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'); // Dummy placeholder
          // audio.play().catch(() => {}); 
      }
  }, [notes, tasks, habits, journal, flashcards, currentStep, isStarted, initialCounts]);

  const handleNext = () => {
      if (stepIndex < STEPS.length - 1) {
          setStepIndex(prev => prev + 1);
          setIsStepComplete(false);
          // Update baseline for next step check
          setInitialCounts({
            notes: notes.length,
            archivedNotes: notes.filter(n => n.status === 'archived').length,
            tasks: tasks.length,
            doingTasks: tasks.filter(t => t.column === 'doing').length,
            journal: journal.length,
            habits: habits.length,
            flashcards: flashcards.length
          });
          onNavigate(STEPS[stepIndex + 1].module);
      } else {
          onClose();
          alert("Протокол обучения завершен. Система передана под ваше управление.");
      }
  };

  // XP CALCULATION
  const xp = (tasks.length * 10) + (notes.length * 5) + (habits.length * 15) + (journal.length * 8);
  const entropy = Math.max(0, 100 - (tasks.filter(t => t.column === 'done').length * 5));

  // --- RENDER: INTRO SCREEN ---
  if (!isStarted) {
      return (
        <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col items-center justify-center p-6 text-cyan-500 font-mono">
            <div className="max-w-2xl w-full border border-cyan-900/50 bg-slate-900/80 p-8 md:p-12 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden">
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-scan"></div>

                <div className="flex items-center gap-4 mb-8">
                    <Bot size={48} className="animate-pulse" />
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] text-white">STARFINDER</h1>
                        <p className="text-xs uppercase tracking-widest text-cyan-700">Protocol v2.0 // Initiation</p>
                    </div>
                </div>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-slate-300">
                    <p>
                        <span className="text-cyan-400 font-bold">{">"} </span>
                        Обнаружен новый Архитектор. Система жизнеобеспечения и когнитивного контроля активирована.
                    </p>
                    <p>
                        <span className="text-cyan-400 font-bold">{">"} </span>
                        Текущий статус: <span className="text-red-400">ДЕЗОРИЕНТАЦИЯ</span>. 
                        Требуется калибровка нейроинтерфейса и модулей управления.
                    </p>
                    <p>
                        <span className="text-cyan-400 font-bold">{">"} </span>
                        Запустить обучающую симуляцию для восстановления контроля над реальностью?
                    </p>
                </div>

                <div className="mt-12 flex gap-4">
                    <button 
                        onClick={startProtocol}
                        className="flex-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/50 px-8 py-4 rounded uppercase tracking-widest font-bold transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 group"
                    >
                        <Play size={16} className="fill-current" /> Запустить Протокол
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-6 py-4 text-slate-500 hover:text-slate-300 uppercase tracking-widest text-xs transition-colors"
                    >
                        Пропустить
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER: HUD OVERLAY ---
  return (
    <div className="fixed inset-x-0 bottom-0 z-[190] pointer-events-none p-4 md:p-6 flex justify-center">
        <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-5xl bg-[#020617]/90 backdrop-blur-md border-t border-x border-cyan-500/30 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-1 pointer-events-auto relative overflow-hidden"
        >
            {/* Decoration Lines */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-900/20" />

            <div className="flex flex-col md:flex-row items-stretch h-full">
                
                {/* 1. OPERATOR AVATAR */}
                <div className="w-full md:w-48 p-4 bg-slate-900/50 border-b md:border-b-0 md:border-r border-cyan-500/10 flex items-center gap-4 md:block">
                    <div className="relative w-12 h-12 md:w-16 md:h-16 mx-auto mb-0 md:mb-2 flex items-center justify-center bg-cyan-950/30 rounded-full border border-cyan-500/30">
                        <Radio size={24} className="text-cyan-400 animate-pulse" />
                        <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-ping opacity-20" />
                    </div>
                    <div className="flex-1 md:text-center">
                        <div className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest">Operator</div>
                        <div className="text-xs font-bold text-slate-300">ONLINE</div>
                    </div>
                </div>

                {/* 2. MAIN CONSOLE */}
                <div className="flex-1 p-4 md:p-6 flex flex-col justify-center relative">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-mono text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity size={10} /> Step {stepIndex + 1}/{STEPS.length}: {currentStep.label}
                        </div>
                        {isStepComplete && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                                COMPLETE
                            </span>
                        )}
                    </div>
                    
                    <div className="font-mono text-sm md:text-base text-cyan-100 leading-relaxed mb-4 min-h-[3rem]">
                        <TypewriterText key={stepIndex} text={currentStep.dialogue} />
                    </div>

                    <div className="bg-slate-900/80 border-l-2 border-amber-500 pl-3 py-2 text-xs text-slate-400">
                        <span className="text-amber-500 font-bold">ОБЪЕКТИВ:</span> {currentStep.objective}
                    </div>

                    {isStepComplete && (
                        <button 
                            onClick={handleNext}
                            className="absolute right-4 bottom-4 md:top-1/2 md:-translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg shadow-emerald-900/50 flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300"
                        >
                            <span>PROCEED</span> <ChevronRight size={16} />
                        </button>
                    )}
                </div>

                {/* 3. MINI DASHBOARD */}
                <div className="w-full md:w-64 bg-slate-950/50 border-t md:border-t-0 md:border-l border-cyan-500/10 p-4 flex flex-row md:flex-col gap-4 justify-between md:justify-center">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Zap size={8} /> System XP
                        </div>
                        <div className="text-xl font-mono text-white font-bold">{xp}</div>
                        <MiniChart value={xp % 100} max={100} color="bg-cyan-500" />
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Activity size={8} /> Entropy
                        </div>
                        <div className="text-xl font-mono text-white font-bold">{entropy}%</div>
                        <MiniChart value={entropy} max={100} color="bg-rose-500" />
                    </div>
                </div>

                {/* CLOSE BTN */}
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 text-slate-600 hover:text-slate-400 p-1"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    </div>
  );
};

export default LearningMode;
