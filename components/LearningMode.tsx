import React, { useState } from 'react';
import { Module } from '../types';
import { StickyNote, Box, Dumbbell, Kanban as KanbanIcon, Book, ArrowRight, ArrowLeft, FlaskConical, X, Flame } from 'lucide-react';

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
      title: "Заметки/Входящие",
      subtitle: "На скорости мысли",
      description: "Всё начинается здесь. Не фильтруй мысли. Записывай идеи, цитаты, инсайты или просто тревоги. Это твое хранилище сырого материала. Лучшее сохрани в «Библиотеке».",
      icon: StickyNote,
      color: "bg-blue-500",
      module: Module.NAPKINS,
      actionLabel: "К Заметкам"
    },
    {
      id: 1,
      title: "Хаб",
      subtitle: "Трансформация",
      description: "Выбери мысль из «Входящих заметок» и отправь её в «Хаб». Поработай над ней с ИИ-менторами. Лучшая команда поможет превратить хаотичные мысли и идеи в чёткий план действий или глубокий принцип.",
      icon: Box,
      color: "bg-amber-500",
      module: Module.SANDBOX,
      actionLabel: "В Хаб"
    },
    {
      id: 2,
      title: "Спринты",
      subtitle: "От слов к делу",
      description: "Мысли и идеи без действий мертвы. В «Спринтах» они становятся задачами. Используй «Челленджи», чтобы бросать себе вызовы, и ИИ-консультанта, если нужна поддержка.",
      icon: KanbanIcon,
      color: "bg-emerald-500",
      module: Module.KANBAN,
      actionLabel: "К Спринтам"
    },
    {
      id: 3,
      title: "Скиллы",
      subtitle: "Нейропластичность",
      description: "Важные принципы нужно помнить. В «Хабе» ты создаешь «навыки» (флеш-карточки). Здесь ты тренируешь свой мозг, чтобы новые знания стали частью тебя.",
      icon: Dumbbell,
      color: "bg-indigo-500",
      module: Module.MENTAL_GYM,
      actionLabel: "В Скиллы"
    },
    {
      id: 4,
      title: "Трекер",
      subtitle: "Система",
      description: "Сила в системе. Заведи полезные привычки и отслеживай прогресс.",
      icon: Flame,
      color: "bg-orange-500",
      module: Module.RITUALS,
      actionLabel: "К Трекеру"
    },
    {
      id: 5,
      title: "Дневник",
      subtitle: "Рефлексия",
      description: "Здесь можно порефлексировать. Свяжи запись в дневнике с конкретной задачей, или просто пиши. ИИ-наставник прокомментирует твой опыт, помогая извлечь уроки из каждой победы или поражения.",
      icon: Book,
      color: "bg-cyan-600",
      module: Module.JOURNAL,
      actionLabel: "В Дневник"
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
    <div className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar-light animate-in fade-in duration-300">
      {/* Mobile Close Button */}
      <button 
        onClick={onStart}
        className="md:hidden absolute top-6 right-6 p-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-400 z-[70]"
      >
        <X size={20} />
      </button>

      <div className="max-w-4xl mx-auto w-full p-6 md:p-12">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-12">
           <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-200">
              <FlaskConical size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-light text-slate-800 tracking-tight">Практикум</h1>
              <p className="text-slate-500 text-sm">Немного знаний для старта</p>
           </div>
        </header>

        {/* Progress Bar */}
        <div className="relative mb-16 px-4">
           <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full" />
           <div 
             className="absolute top-1/2 left-0 h-1 bg-slate-900 -translate-y-1/2 transition-all duration-500 rounded-full" 
             style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
           />
           <div className="relative flex justify-between">
              {steps.map((s, idx) => (
                <div 
                  key={s.id} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    idx <= currentStep ? 'bg-slate-900 border-slate-900 text-white scale-110' : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  <s.icon size={16} />
                </div>
              ))}
           </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
           <div className={`h-2 ${current.color} transition-colors duration-500`} />
           <div className="p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center">
              
              <div className={`shrink-0 w-32 h-32 md:w-48 md:h-48 rounded-3xl ${current.color} flex items-center justify-center text-white shadow-2xl transition-all duration-500`}>
                 <current.icon size={currentStep === 5 ? 64 : 80} strokeWidth={1} />
              </div>

              <div className="flex-1 space-y-6 text-center md:text-left">
                 <div className="space-y-1">
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">{current.title}</h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{current.subtitle}</span>
                 </div>
                 <p className="text-slate-600 text-lg leading-relaxed font-light">
                    {current.description}
                 </p>
                 
                 <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
                    <button 
                      onClick={() => onNavigate(current.module)}
                      className={`w-full md:w-auto px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-all flex items-center justify-center gap-2 group`}
                    >
                       Попробовать <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="hidden md:block flex-1" />

                    <div className="flex gap-2 w-full md:w-auto">
                        {currentStep > 0 && (
                          <button 
                            onClick={prev}
                            className="flex-1 md:flex-none p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                          >
                             <ArrowLeft size={24} />
                          </button>
                        )}
                        <button 
                          onClick={next}
                          className="flex-[2] md:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                           {currentStep === steps.length - 1 ? "Начать Путь" : "Далее"} 
                           {currentStep < steps.length - 1 && <ArrowRight size={20} />}
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LearningMode;