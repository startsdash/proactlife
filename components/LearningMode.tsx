import React, { useState } from 'react';
import { Module } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Book, ArrowRight, ArrowLeft, X } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  module: Module;
  actionLabel: string;
}

interface Props {
  onStart: () => void;
  onNavigate: (m: Module) => void;
}

const LearningMode: React.FC<Props> = ({ onStart, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      id: 0,
      title: "Этап 1. Хаос",
      subtitle: "Инбокс",
      description: "Всё начинается здесь. Не фильтруйте мысли. Записывайте идеи, цитаты, инсайты или просто тревоги. Это ваше хранилище сырого материала.",
      icon: StickyNote,
      color: "bg-blue-500",
      module: Module.NAPKINS,
      actionLabel: "К Инбоксу"
    },
    {
      id: 1,
      title: "Этап 2. Трансформация",
      subtitle: "Разбор",
      description: "Выберите мысль из «Инбокса» и отправьте её в «Разбор». Здесь Консилиум ИИ-менторов (Питерсон, Талеб, Грин и др.) поможет вам превратить хаотичную идею в чёткий план действий или глубокий принцип.",
      icon: Box,
      color: "bg-amber-500",
      module: Module.SANDBOX,
      actionLabel: "В Разбор"
    },
    {
      id: 2,
      title: "Этап 3. От слов к делу",
      subtitle: "Трекер",
      description: "Идеи без действий мертвы. В «Трекере» ваши планы становятся задачами. Используйте Челленджи, чтобы бросать себе вызовы, и ИИ-терапию, если застряли. Двигайте карточки в колонку «Сделано».",
      icon: KanbanIcon,
      color: "bg-emerald-500",
      module: Module.KANBAN,
      actionLabel: "В Трекер"
    },
    {
      id: 3,
      title: "Этап 4. Навыки",
      subtitle: "Нейро",
      description: "Важные принципы нужно помнить. В «Разборе» вы создаёте «навыки» (флеш-карточки). Здесь вы тренируете свой мозг, чтобы новые знания стали частью вашего автоматического поведения.",
      icon: Dumbbell,
      color: "bg-indigo-500",
      module: Module.MENTAL_GYM,
      actionLabel: "В Нейро"
    },
    {
      id: 4,
      title: "Этап 5. Путь",
      subtitle: "Хроника",
      description: "В конце дня или после задачи — рефлексируйте. Свяжите запись в хронике с конкретной задачей. ИИ прокомментирует ваш опыт, помогая извлечь уроки из каждой победы или поражения.",
      icon: Book,
      color: "bg-slate-800",
      module: Module.JOURNAL,
      actionLabel: "В Хронику"
    }
  ];

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else onStart();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-y-auto custom-scrollbar-light animate-in fade-in duration-300 p-6 md:p-12">
      {/* Mobile Close Button */}
      <button 
        onClick={onStart}
        className="md:hidden absolute top-6 right-6 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-400 z-[70]"
      >
        <X size={20} />
      </button>

      <div className="max-w-4xl mx-auto w-full h-full flex flex-col items-center justify-center min-h-[500px]">
         
         {/* HEADER */}
         <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-light text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Академия <span className="font-bold text-indigo-600 dark:text-indigo-400">Live.Act</span></h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">Как работает система продуктивности</p>
         </div>

         {/* CARD */}
         <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-2xl overflow-hidden relative flex flex-col md:flex-row">
            
            {/* LEFT: VISUAL */}
            <div className={`${current.color} p-8 md:w-1/3 flex items-center justify-center relative overflow-hidden transition-colors duration-500`}>
                 <div className="absolute inset-0 bg-black/10" />
                 <current.icon size={80} className="text-white relative z-10 drop-shadow-md" strokeWidth={1.5} />
            </div>

            {/* RIGHT: CONTENT */}
            <div className="p-8 md:p-10 md:w-2/3 flex flex-col">
                <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{current.subtitle}</div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{current.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {current.description}
                    </p>
                </div>

                <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex gap-2">
                        {steps.map((s, idx) => (
                            <div 
                                key={s.id} 
                                className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? `w-8 ${current.color.replace('bg-', 'bg-')}` : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                            />
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={prev} 
                            disabled={currentStep === 0}
                            className={`p-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button 
                            onClick={next} 
                            className={`px-6 py-3 rounded-full text-white font-medium flex items-center gap-2 transition-all hover:opacity-90 active:scale-95 shadow-lg ${current.color}`}
                        >
                            {currentStep === steps.length - 1 ? "Начать работу" : "Далее"}
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
         </div>
         
         <div className="mt-8">
             <button onClick={onStart} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium">
                 Пропустить обучение
             </button>
         </div>

      </div>
    </div>
  );
};

export default LearningMode;